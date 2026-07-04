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
          .describe("Defaults to photo. Use cine only when the user wants cinema lenses."),
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
          .describe(
            "Grams; lens weight must be ≤ this. Use only for an explicit limit. For a vague " +
              "'light' preference use sortBy: weightG instead (no hard cutoff).",
          ),
        maxLengthMm: z
          .number()
          .optional()
          .describe(
            "Barrel length ceiling in mm — for 'compact', 'pocketable', 'small'. Use only for an " +
              "explicit size cap; for a vague size preference use sortBy: length instead.",
          ),
        maxApertureF: z
          .object({ wide: z.number().optional(), tele: z.number().optional() })
          .optional()
          .describe(
            "f-number ceiling (smaller = wider). wide = wide end (the usual 'large aperture' " +
              "reading); tele = long end (for 'constant f2.8' / 'f2.8 even at tele'). Use only for " +
              "an explicit f-number. For a vague 'good bokeh' preference use sortBy: maxAperture.",
          ),
        maxPrice: z
          .number()
          .optional()
          .describe("Price ceiling in the user's currency (CNY for zh, USD for en)."),
        minMagnification: z
          .number()
          .optional()
          .describe(
            "Minimum magnification ratio for close-up work (0.5 = half life-size, 1 = 1:1 " +
              "true macro). Use only for an explicit close-up need; for a vague 'good for " +
              "close-ups' use sortBy: magnification.",
          ),
        minApertureBladeCount: z
          .number()
          .optional()
          .describe(
            "Minimum aperture blades — for 'round bokeh' / 'smooth out-of-focus'. More blades " +
              "keep the aperture rounder when stopped down. Use only when the user cares about " +
              "bokeh shape (typically 9+).",
          ),
        minReleaseYear: z
          .number()
          .optional()
          .describe("Only lenses released in or after this year. For 'newest' use sortBy: releaseYear desc."),
        sortBy: z
          .enum(RECALL_SORT_FIELDS)
          .optional()
          .describe(
            "Rank by a single axis — use this for a soft preference instead of a hard filter. " +
              "reach = longest focal reach ('the longer the better'); wideEnd = widest; " +
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
        "Look up lenses by model or brand name (e.g. '18-55', 'XF35', 'Viltrox 27'). Use when " +
        "the user names a specific lens rather than describing a need.",
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
        "Present your final picks as recommendation cards — call this once you've chosen which " +
        "lenses to recommend (3–6, ordered best-first). Pass each lens's id (from a prior " +
        "queryLenses/searchLensByName result) and a short card reason: a readable phrase or at " +
        "most one short sentence with natural punctuation, giving the single most compelling " +
        "reason it fits. The detailed comparison and pros/cons belong in your prose bullets, not on the card.",
      inputSchema: z.object({
        picks: z
          .array(
            z.object({
              id: z.string().describe("The lens id from a prior tool result."),
              reason: z
                .string()
                .describe(
                  "A short, readable reason in the user's language — a phrase or at most one short " +
                    "sentence with natural punctuation. Detailed pros/cons go in prose, not here.",
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
