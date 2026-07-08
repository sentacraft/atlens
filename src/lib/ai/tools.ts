import { tool } from "ai";
import { z } from "zod";
import { FILTER_FEATURE_KEYS } from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens/search";
import { recallLenses, recommendLenses, resolveLens, RECALL_SORT_FIELDS } from "@/lib/ai/recall";
import { OPTICAL_TRAITS, type Mount } from "@/lib/types";

// How many recalled lenses one queryLenses call returns to the model, after the
// active sort. Bounds tool-result size / token cost; totalMatched still tells the
// model how many more matched beyond the cap. Tests call recallLenses with a
// different cap to inspect the full match set.
const RECALL_LIMIT = 20;

// The agent's tools, bound to the current mount + locale (both fixed by the
// route, never model-supplied). Parameter semantics live in `.describe()` so the
// model learns them from the tool schema, not the system prompt.
export function buildLensTools(
  mount: Mount,
  locale: string,
  tBrand: (brand: string) => string,
) {
  // Every lens id this turn's query/search calls have returned, so recommendLenses
  // can reject a pick the model never recalled. Turn-scoped: a lens recalled only in
  // an earlier turn must be looked up again before it can be recommended.
  const recalledIds = new Set<string>();

  return {
    queryLenses: tool({
      description:
        "Recall lenses by objective specs for a need-based request. Translate the " +
        "user's described needs into these parameters. Returns { matches (meet every " +
        "constraint), maybe (a constrained field has no data for that lens — surface " +
        "these honestly, never drop them), totalMatched, totalMaybe }. matches/maybe are " +
        `capped at the top ${RECALL_LIMIT} by your sort; if totalMatched is larger, tell the user the ` +
        "total and NARROW the query (add a constraint) — there is no paging.",
      inputSchema: z.object({
        brands: z
          .array(z.string())
          .optional()
          .describe("Brand whitelist, lowercase (e.g. 'fujifilm', 'sigma', 'viltrox')."),
        type: z.enum(["prime", "zoom"]).optional(),
        focus: z
          .enum(["auto", "manual"])
          .optional()
          .describe("auto = autofocus, manual = manual-focus only. Omit unless the user implies one."),
        usage: z
          .enum(["photo", "cine"])
          .optional()
          .describe(
            "Which catalogue to search. Defaults to photo; cine lenses are excluded unless set to cine.",
          ),
        features: z
          .array(z.enum(FILTER_FEATURE_KEYS))
          .optional()
          .describe(
            "Lens must have ALL of these. ois = stabilization, wr = weather-resistant, " +
              "apertureRing, powerZoom, internalZoom.",
          ),
        opticalTraits: z
          .array(z.enum(OPTICAL_TRAITS))
          .optional()
          .describe(
            "Restrict to lenses having any of these. fisheye/tilt/shift/anamorphic/probe " +
              "are hidden by default and appear ONLY when named here; macro is always available.",
          ),
        coversFocals: z
          .array(z.number())
          .optional()
          .describe(
            "Native focal length(s) in mm — the number printed on the lens (a 56mm lens is 56), " +
              "not the full-frame equivalent — that the lens must be able to shoot, matched within " +
              "a small tolerance. Each value is required independently: the lens's focal range must " +
              "include every one of them, not merely the span between them. A prime is a single " +
              "focal, so it can satisfy at most one value near that focal — passing two or more " +
              "values excludes every prime. To place a prime within a focal range, use focalWithin.",
          ),
        focalWithin: z
          .tuple([z.number().nullable(), z.number().nullable()])
          .optional()
          .describe(
            "Native focal length [min, max] in mm (the number printed on the lens, not the " +
              "full-frame equivalent); null leaves that end open. The lens's ENTIRE focal range " +
              "must lie inside the window: a zoom passes only if both its ends are inside, a prime " +
              "passes if its single focal is inside. This is the inverse of coversFocals, whose " +
              "values must lie inside the lens's range rather than the reverse.",
          ),
        maxWeightG: z
          .number()
          .optional()
          .describe("Grams; a hard upper bound on lens weight."),
        maxLengthMm: z
          .number()
          .optional()
          .describe("Barrel length ceiling in mm; a hard upper bound."),
        maxApertureF: z
          .object({ wide: z.number().optional(), tele: z.number().optional() })
          .optional()
          .describe(
            "f-number ceiling (smaller = wider), a hard bound. wide bounds the wide-end " +
              "aperture, tele the long-end aperture.",
          ),
        maxPrice: z
          .number()
          .optional()
          .describe("Price ceiling in the user's currency (CNY for zh, USD for en)."),
        minMagnification: z
          .number()
          .optional()
          .describe(
            "Minimum magnification ratio (0.5 = half life-size, 1 = 1:1 true macro); a hard lower bound.",
          ),
        minApertureBladeCount: z
          .number()
          .optional()
          .describe(
            "Minimum aperture blade count; a hard lower bound. More blades keep the aperture " +
              "opening rounder when stopped down.",
          ),
        minReleaseYear: z
          .number()
          .optional()
          .describe("Only lenses released in or after this year; a hard lower bound."),
        sortBy: z
          .enum(RECALL_SORT_FIELDS)
          .optional()
          .describe(
            "Rank by a single axis — use this for a soft preference instead of a hard filter. " +
              "reach = longest focal reach; wideEnd = widest; " +
              "weightG = lightest; maxAperture = fastest; length = most compact; price = " +
              "cheapest; magnification = best close-up; zoomRatio = most versatile / one-lens; " +
              "releaseYear = newest (with sortDir: desc).",
          ),
        sortDir: z.enum(["asc", "desc"]).optional().describe("asc (default) = smallest first."),
      }),
      execute: (constraints) => {
        const result = recallLenses(mount, locale, constraints, tBrand, RECALL_LIMIT);
        // Record what this call surfaced so recommendLenses can check its picks. Both
        // buckets are shown to the user; matches hold the lens directly, maybe wraps it.
        for (const lens of result.matches) {
          recalledIds.add(lens.id);
        }
        for (const { lens } of result.maybe) {
          recalledIds.add(lens.id);
        }
        return result;
      },
    }),

    searchLensByName: tool({
      description:
        "Look up lenses by model or brand name (e.g. '18-55', 'XF35', 'Viltrox 27'). A name-based " +
        "lookup, as opposed to queryLenses's need-based recall.",
      inputSchema: z.object({
        query: z.string().describe("The model or brand text the user typed."),
        limit: z.number().optional().describe("Max results (default 8)."),
      }),
      execute: ({ query, limit }) => {
        const index = buildLensSearchIndex(getLensesByMount(mount, locale));
        const results = searchLensIndex(index, query, limit ?? 8);
        for (const lens of results) {
          recalledIds.add(lens.id);
        }
        return { results: results.map((lens) => resolveLens(lens, locale, tBrand)) };
      },
    }),

    recommendLenses: tool({
      description:
        "Present your final picks as a grid of recommendation cards — call this once you've chosen " +
        "which lenses to recommend (3–6, ordered best-first). Pass each lens's id (from a prior " +
        "queryLenses/searchLensByName result) and its reason, which is shown on the card and is " +
        "where that lens's case belongs. Keep any prose around the cards to a short synthesis.",
      inputSchema: z.object({
        picks: z
          .array(
            z.object({
              id: z.string().describe("The lens id from a prior tool result."),
              reason: z
                .string()
                .describe(
                  "The lens's case, shown on its card, in the user's language: one to three natural " +
                    "sentences on what it's good for and its main trade-off.",
                ),
            }),
          )
          .min(1)
          .max(6),
      }),
      execute: ({ picks }) => recommendLenses(mount, locale, picks, tBrand, recalledIds),
      // Full recommendations stream to the client (the cards); the model already
      // saw these lenses in the query result, so feed it a lean ack, not the specs
      // again. Requires passing this same ToolSet to convertToModelMessages.
      toModelOutput: ({ output }) => ({
        type: "text",
        value: `Rendered ${output.recommendations.length} recommendation card(s) to the user.`,
      }),
    }),
  };
}
