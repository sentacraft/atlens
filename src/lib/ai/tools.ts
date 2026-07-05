import { tool } from "ai";
import { z } from "zod";
import { FILTER_FEATURE_KEYS } from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens/search";
import { recallLenses, recommendLenses, resolveLens, RECALL_SORT_FIELDS } from "@/lib/ai/recall";
import { OPTICAL_TRAITS, type Mount } from "@/lib/types";

// The agent's tools, bound to the current mount + locale (both fixed by the
// route, never model-supplied). Parameter semantics live in `.describe()` so the
// model learns them from the tool schema, not the system prompt.
export function buildLensTools(
  mount: Mount,
  locale: string,
  tBrand: (brand: string) => string,
) {
  return {
    queryLenses: tool({
      description:
        "Recall lenses by objective specs for a need-based request. Translate the " +
        "user's described needs into these parameters. Returns { matches (meet every " +
        "constraint), maybe (a constrained field has no data for that lens — surface " +
        "these honestly, never drop them), totalMatched, totalMaybe }. matches/maybe are " +
        "capped at the top 20 by your sort; if totalMatched is larger, tell the user the " +
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
            "Full-frame-equivalent mm; the lens must shoot at EACH value individually (NOT " +
              "'somewhere in between'). A prime covers only its one focal — never pass two " +
              "points with type prime (coversFocals [50,85] on a prime matches nothing); for " +
              "'a prime around 85mm' or 'a portrait prime' use focalWithin. List only focals " +
              "the user explicitly needs ('over 100mm' is [100], not [100,200]); for 'the " +
              "longer the better' use sortBy: reach. [50] = covers 50; [24,70] = one zoom " +
              "spanning 24–70.",
          ),
        focalWithin: z
          .tuple([z.number().nullable(), z.number().nullable()])
          .optional()
          .describe(
            "Full-frame-equivalent mm [min,max]; null = open end. The lens's WHOLE range must " +
              "sit inside — for a PRIME this means its single focal falls in [min,max], so this " +
              "is the right tool for 'a portrait prime ~85mm' ([75,90]) or 'a 50mm-ish prime' " +
              "([45,60]). [null,35] = a wide lens; [24,null] = nothing wider than 24mm.",
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
      execute: (constraints) => recallLenses(mount, locale, constraints, tBrand),
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
      execute: ({ picks }) => recommendLenses(mount, locale, picks, tBrand),
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
