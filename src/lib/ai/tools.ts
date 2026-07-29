import { tool } from "ai";
import { z } from "zod";
import { FILTER_FEATURE_KEYS } from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens/search";
import {
  recallLenses,
  recommendLenses,
  listLenses,
  resolveLens,
  toRecalled,
  RECALL_SORT_NAMES,
  LENS_TABLE_COLUMNS,
} from "@/lib/ai/recall";
import { lensRef, buildRefIndex } from "@/lib/ai/lens-ref";
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
  // Every lens ref this turn's query/search calls have returned, so recommendLenses can
  // reject a pick the model never recalled. Turn-scoped: a lens recalled only in an
  // earlier turn must be looked up again before it can be recommended. Refs, not ids —
  // the id never reaches the model, so it is not what comes back either.
  const recalledRefs = new Set<string>();

  return {
    queryLenses: tool({
      description:
        "Recall lenses by spec. Every parameter is a hard constraint, so set one only for a " +
        "requirement the request makes; an unset one leaves that axis unrestricted. `maybe` " +
        "holds lenses with no data on a constrained field — surface them, never drop them. " +
        `Results are capped at ${RECALL_LIMIT} by your sort, totalMatched is the count beyond the ` +
        "cap, and there is no paging.",
      inputSchema: z.object({
        brands: z
          .array(z.string())
          .optional()
          .describe("Brand whitelist, lowercase (e.g. 'fujifilm', 'sigma', 'viltrox')."),
        type: z.enum(["prime", "zoom"]).optional(),
        focus: z
          .enum(["auto", "manual"])
          .optional()
          .describe("auto = autofocus, manual = manual-focus only."),
        usage: z
          .enum(["photo", "cine"])
          .optional()
          .describe(
            "Defaults to photo; cine lenses appear only when set to cine.",
          ),
        features: z
          .array(z.enum(FILTER_FEATURE_KEYS))
          .optional()
          .describe(
            "Lens must have ALL of these. ois = stabilization, wr = weather-resistant.",
          ),
        opticalTraits: z
          .array(z.enum(OPTICAL_TRAITS))
          .optional()
          .describe(
            "Restrict to lenses having any of these. fisheye/tilt/shift/anamorphic/probe " +
              "appear only when named here; macro always appears.",
          ),
        coversFocals: z
          .array(z.number())
          .optional()
          .describe(
            "Native focal lengths in mm (the number printed on the lens, not the full-frame " +
              "equivalent) the lens must reach, matched within a small tolerance. Each value is " +
              "required independently, so the lens's range must include every one — two or more " +
              "values exclude every prime.",
          ),
        // An object rather than a [min, max] tuple: a tuple compiles to prefixItems, which
        // the OpenAPI-3.0 subset behind Google's function declarations rejects outright.
        // Named bounds are portable everywhere, and match maxApertureF's shape below.
        focalWithin: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Native focal window in mm (the number printed on the lens, not the full-frame " +
              "equivalent); an omitted end is open. The lens's ENTIRE focal range must lie inside it.",
          ),
        minReach: z
          .number()
          .optional()
          .describe("Native mm; a hard lower bound on the lens's longest focal length (its tele end)."),
        maxWide: z
          .number()
          .optional()
          .describe("Native mm; a hard upper bound on the lens's shortest focal length (its wide end)."),
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
            "f-number ceiling at each zoom end (smaller = wider); a hard bound.",
          ),
        maxPrice: z
          .number()
          .optional()
          .describe("Price ceiling in the user's currency (CNY for zh, USD for en)."),
        minMagnification: z
          .number()
          .optional()
          .describe(
            "Minimum magnification ratio (1 = life-size); a hard lower bound.",
          ),
        minApertureBladeCount: z
          .number()
          .optional()
          .describe(
            "Minimum aperture blade count; a hard lower bound.",
          ),
        minReleaseYear: z
          .number()
          .optional()
          .describe("Only lenses released in or after this year; a hard lower bound."),
        sortBy: z
          .enum(RECALL_SORT_NAMES)
          .optional()
          .describe(
            "Which lenses lead the results. It orders them, it never excludes any, so the " +
              "cap keeps the ones this names. fastest = widest maximum aperture; " +
              "widestZoomRange = highest ratio of longest to shortest focal.",
          ),
      }),
      execute: (constraints) => {
        const result = recallLenses(mount, locale, constraints, tBrand, RECALL_LIMIT);
        // Record what this call surfaced so recommendLenses can check its picks. Both
        // buckets are shown to the user; matches hold the lens directly, maybe wraps it.
        for (const lens of result.matches) {
          recalledRefs.add(lens.ref);
        }
        for (const { lens } of result.maybe) {
          recalledRefs.add(lens.ref);
        }
        return result;
      },
    }),

    searchLensByName: tool({
      description: "Look up lenses by model or brand name (e.g. '18-55', 'XF35', 'Viltrox 27').",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "One lens's model or brand identifier, extracted from the request — a short " +
              "name or number token, matched against a name index. Not a full sentence, and " +
              "not several lenses at once; to look up more than one, call once per lens.",
          ),
        limit: z.number().optional().describe("Max results (default 8)."),
      }),
      execute: ({ query, limit }) => {
        const index = buildLensSearchIndex(getLensesByMount(mount, locale));
        const results = searchLensIndex(index, query, limit ?? 8);
        for (const lens of results) {
          recalledRefs.add(lensRef(lens.id));
        }
        // Same projection as a recall: a name lookup is still the model choosing between
        // lenses, so it gets refs and the fields to choose on — never the id.
        return { results: results.map((lens) => toRecalled(resolveLens(lens, locale, tBrand))) };
      },
    }),

    lensDetails: tool({
      description:
        "Return the full spec record for lenses already in hand, by ref — every field the " +
        "catalogue holds, including the long tail a recall result leaves out (optical " +
        "construction, filter thread, aperture blades, minimum aperture, T-stops, focus " +
        "motor, internal focusing, barrel diameter, materials, zoom mechanics, generation, " +
        "bundled accessories). Renders nothing to the user.",
      inputSchema: z.object({
        refs: z
          .array(z.string())
          .min(1)
          .max(6)
          .describe("Lens refs, each from a prior queryLenses/searchLensByName result."),
      }),
      execute: ({ refs }) => {
        const byRef = buildRefIndex(getLensesByMount(mount, locale));
        return {
          lenses: refs.map((ref) => {
            // Same gate as the render tools: a lens this turn never recalled can't be
            // inspected either, so a conjured ref fails loudly instead of resolving.
            if (!recalledRefs.has(ref)) {
              throw new Error(
                `Lens ref "${ref}" was not returned by any queryLenses/searchLensByName call ` +
                  `this turn. Look it up first, and pass the ref exactly as it appears.`,
              );
            }
            const lens = byRef.get(ref);
            if (!lens) {
              throw new Error(`Unknown lens ref "${ref}".`);
            }
            return resolveLens(lens, locale, tBrand);
          }),
        };
      },
    }),

    recommendLenses: tool({
      description:
        "Present picks as a grid of recommendation cards (up to 6, ordered best-first). Pass each " +
        "lens's ref from a prior queryLenses/searchLensByName result and its reason, which is " +
        "shown on the lens's card. Call it once per group, and title each group here.",
      inputSchema: z.object({
        picks: z
          .array(
            z.object({
              ref: z.string().describe("The lens ref from a prior tool result."),
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
        title: z
          .string()
          .optional()
          .describe("A short heading above this group, in the user's language."),
      }),
      execute: ({ picks, title }) =>
        recommendLenses(mount, locale, picks, title, tBrand, recalledRefs),
      // Full recommendations stream to the client (the cards); the model already saw
      // these lenses in the query result, so feed it a lean ack, not the specs again.
      // The refs do come back, though: the synthesis prose that follows has to cite them
      // to link a lens, and digging them back out of an earlier 20-lens query result is
      // the kind of retrieval cost that gets skipped. Requires passing this same ToolSet
      // to convertToModelMessages.
      toModelOutput: ({ output }) => ({
        type: "text",
        value:
          `Rendered ${output.recommendations.length} recommendation card(s) to the user, for: ` +
          output.recommendations.map((rec) => lensRef(rec.id)).join(", "),
      }),
    }),

    listLenses: tool({
      description:
        "Lay out already-recalled lenses as a neutral spec table; their names link to each " +
        "lens's page. Pass refs from a prior queryLenses/searchLensByName result.",
      inputSchema: z.object({
        refs: z
          .array(z.string())
          .min(1)
          .describe("Lens refs to table, in the order to show them, each from a prior tool result."),
        columns: z
          .array(z.enum(LENS_TABLE_COLUMNS))
          .optional()
          .describe(
            "Spec columns to place beside the name, in order — the ones that answer the " +
              "user's question. Defaults to focal, aperture, weight, and price.",
          ),
        caption: z
          .string()
          .optional()
          .describe("An optional short caption above the table, in the user's language."),
      }),
      execute: ({ refs, columns, caption }) =>
        listLenses(mount, locale, refs, columns, caption, tBrand, recalledRefs),
      // The rows stream to the client (the table); the model already saw these lenses in
      // the query result, so feed it a lean ack, not the specs again — but the refs come
      // back, since the prose after it has to cite them to link a lens. Requires passing
      // this same ToolSet to convertToModelMessages.
      toModelOutput: ({ output }) => ({
        type: "text",
        value:
          `Rendered a table of ${output.lenses.length} lens(es) to the user, for: ` +
          output.lenses.map((lens) => lensRef(lens.id)).join(", "),
      }),
    }),
  };
}
