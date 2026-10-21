import { getToolName, isToolUIPart, tool, type UIMessage } from "ai";
import { z } from "zod";
import { FILTER_FEATURE_KEYS } from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens/search";
import {
  recallLenses,
  recommendLenses,
  listLenses,
  resolveLens,
  toDetailed,
  toRecalled,
  RECALL_SORT_NAMES,
  LENS_TABLE_COLUMNS,
} from "@/lib/ai/recall";
import { lensRef, buildRefIndex } from "@/lib/ai/lens-ref";
import { OPTICAL_TRAITS, type Mount } from "@/lib/types";
import { ASK_FOR_GEAR, gearRequestInputSchema, gearRequestOutputSchema } from "@/lib/ai/gear-request";
import { SITE_TOPICS, siteFacts } from "@/lib/site-facts";
import { SKILL_NAMES, readSkill } from "@/lib/ai/skills";
import { favoritesOnMount } from "@/lib/ai/favorites";

const RECALL_LIMIT = 20;

const recallConstraintsSchema = z.object({
  brands: z
    .array(z.string())
    .nullish()
    .describe("Brand whitelist, lowercase (e.g. 'fujifilm', 'sigma', 'viltrox')."),
  type: z.enum(["prime", "zoom"]).nullish(),
  focus: z
    .enum(["auto", "manual"])
    .nullish()
    .describe("auto = autofocus, manual = manual-focus only."),
  usage: z
    .enum(["photo", "cine"])
    .nullish()
    .describe(
      "Defaults to photo; cine lenses appear only when set to cine.",
    ),
  features: z
    .array(z.enum(FILTER_FEATURE_KEYS))
    .nullish()
    .describe(
      "Lens must have ALL of these. ois = stabilization, wr = weather-resistant.",
    ),
  opticalTraits: z
    .array(z.enum(OPTICAL_TRAITS))
    .nullish()
    .describe(
      "Restrict to lenses having any of these. fisheye/tilt/shift/anamorphic/probe " +
        "appear only when named here; macro always appears.",
    ),
  coversFocals: z
    .array(z.number())
    .nullish()
    .describe(
      "Native focal lengths in mm (the number printed on the lens, not the full-frame " +
        "equivalent) the lens must reach, matched within a small tolerance. Each value is " +
        "required independently, so the lens's range must include every one — two or more " +
        "values exclude every prime.",
    ),
  // Not a [min, max] tuple: it compiles to prefixItems, which Google's function
  // declarations reject.
  focalWithin: z
    .object({ min: z.number().nullish(), max: z.number().nullish() })
    .nullish()
    .describe(
      "Native focal window in mm (the number printed on the lens, not the full-frame " +
        "equivalent); an omitted end is open. The lens's ENTIRE focal range must lie inside it.",
    ),
  minReach: z
    .number()
    .nullish()
    .describe("Native mm; a hard lower bound on the lens's longest focal length (its tele end)."),
  maxWide: z
    .number()
    .nullish()
    .describe("Native mm; a hard upper bound on the lens's shortest focal length (its wide end)."),
  maxWeightG: z
    .number()
    .nullish()
    .describe("Grams; a hard upper bound on lens weight."),
  maxLengthMm: z
    .number()
    .nullish()
    .describe("Barrel length ceiling in mm; a hard upper bound."),
  maxApertureF: z
    .object({ wide: z.number().nullish(), tele: z.number().nullish() })
    .nullish()
    .describe(
      "f-number ceiling at each zoom end (smaller = wider); a hard bound.",
    ),
  maxPrice: z
    .number()
    .nullish()
    .describe("Price ceiling in the user's currency (CNY for zh, USD for en)."),
  minMagnification: z
    .number()
    .nullish()
    .describe(
      "Minimum magnification ratio (1 = life-size); a hard lower bound.",
    ),
  minApertureBladeCount: z
    .number()
    .nullish()
    .describe(
      "Minimum aperture blade count; a hard lower bound.",
    ),
  minReleaseYear: z
    .number()
    .nullish()
    .describe("Only lenses released in or after this year; a hard lower bound."),
  sortBy: z
    .enum(RECALL_SORT_NAMES)
    .nullish()
    .describe(
      "Which lenses lead the results. It orders them, it never excludes any, so the " +
        "cap keeps the ones this names. fastest = widest maximum aperture; " +
        "widestZoomRange = highest ratio of longest to shortest focal.",
    ),
});


type RefList = { ref?: unknown }[] | undefined;

// Read loosely: stored turns are replayed even when they no longer match the tool schemas.
const RECALL_OUTPUT_REFS: Record<string, (output: never) => unknown[]> = {
  queryLenses: (output: { results?: { matches?: RefList; maybe?: { lens?: { ref?: unknown } }[] }[] }) =>
    (output.results ?? []).flatMap((result) => [
      ...(result.matches ?? []).map((lens) => lens.ref),
      ...(result.maybe ?? []).map((entry) => entry.lens?.ref),
    ]),
  searchLensByName: (output: { results?: RefList }) => (output.results ?? []).map((lens) => lens.ref),
  myFavorites: (output: { results?: RefList }) => (output.results ?? []).map((lens) => lens.ref),
};

/** Adds every ref a recall tool returned in `messages` to `recalledRefs`. */
export function seedRecalledRefs(recalledRefs: Set<string>, messages: UIMessage[]): void {
  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part) || part.state !== "output-available" || !part.output) {
        continue;
      }
      const refsOf = RECALL_OUTPUT_REFS[getToolName(part)];
      for (const ref of refsOf?.(part.output as never) ?? []) {
        if (typeof ref === "string") {
          recalledRefs.add(ref);
        }
      }
    }
  }
}

/**
 * `readFavorites` resolves to the user's favorite lens ids, newest first, or null for a guest.
 * `recalledRefs` gates every tool that takes a ref; the recall tools add to it, and
 * `seedRecalledRefs` adds the refs they returned earlier in the conversation.
 */
export function buildLensTools(
  mount: Mount,
  locale: string,
  tBrand: (brand: string) => string,
  readFavorites: () => Promise<string[] | null>,
  recalledRefs: Set<string>,
) {

  return {
    queryLenses: tool({
      description:
        "Recall lenses by spec. Every parameter is a hard constraint, so set one only for a " +
        "requirement the request makes; leave the rest out or null, which leaves that axis unrestricted. `maybe` " +
        "holds lenses with no data on a constrained field — surface them, never drop them. " +
        `Results are capped at ${RECALL_LIMIT} per query by your sort, totalMatched is the count ` +
        "beyond the cap, and there is no paging. Independent recalls — say a standard zoom and a " +
        "telephoto for a two-lens kit — go together in one call, one query each.",
      inputSchema: z.object({
        queries: z
          .array(recallConstraintsSchema)
          .min(1)
          .max(4)
          .describe("Constraint sets, each recalled separately; results come back in the same order."),
      }),
      execute: ({ queries }) => ({
        results: queries.map((constraints) => {
          const result = recallLenses(mount, locale, constraints, tBrand, RECALL_LIMIT);
          for (const lens of result.matches) {
            recalledRefs.add(lens.ref);
          }
          for (const { lens } of result.maybe) {
            recalledRefs.add(lens.ref);
          }
          return result;
        }),
        note: "Lenses you put forward for the user to choose from go on cards or a table; prose alone does not show them.",
      }),
    }),

    searchLensByName: tool({
      description:
        "Look up a lens the user named, by model or brand (e.g. '18-55', 'XF35', 'Viltrox 27'). " +
        "Only for names the user gave, not for lenses you thought of yourself; recall those with queryLenses.",
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
        const results = searchLensIndex(index, query, limit ?? 8).map((lens) =>
          toRecalled(resolveLens(lens, locale, tBrand)),
        );
        for (const lens of results) {
          recalledRefs.add(lens.ref);
        }
        return { results };
      },
    }),

    myFavorites: tool({
      description:
        "The lenses the user saved as favorites, newest first, on the current mount. Call it when the user " +
        "refers to lenses they favorited or saved. The refs work with every other tool, like a recall result.",
      inputSchema: z.object({}),
      execute: async () => {
        const ids = await readFavorites();
        // Unreachable through the sign-in gate, which pauses a guest's call until they sign in.
        if (ids === null) {
          throw new Error("The user is not signed in.");
        }
        const { lenses, otherMounts } = favoritesOnMount(ids, mount, locale);
        const results = lenses.slice(0, RECALL_LIMIT).map((lens) => toRecalled(resolveLens(lens, locale, tBrand)));
        for (const lens of results) {
          recalledRefs.add(lens.ref);
        }
        return { results, total: lenses.length, otherMounts };
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
          .describe("Lens refs, each from a prior queryLenses/searchLensByName/myFavorites result."),
      }),
      execute: ({ refs }) => {
        const byRef = buildRefIndex(getLensesByMount(mount, locale));
        return {
          lenses: refs.map((ref) => {
            if (!recalledRefs.has(ref)) {
              throw new Error(
                `Lens ref "${ref}" was not returned by any queryLenses/searchLensByName/myFavorites call ` +
                  `in this conversation. Look it up first, and pass the ref exactly as it appears.`,
              );
            }
            const lens = byRef.get(ref);
            if (!lens) {
              throw new Error(`Unknown lens ref "${ref}".`);
            }
            return toDetailed(resolveLens(lens, locale, tBrand));
          }),
          notInData: "No test results: sharpness, chromatic aberration, distortion and bokeh rendering are not in Atlens's data.",
        };
      },
    }),

    recommendLenses: tool({
      description:
        "Present picks as a grid of recommendation cards (up to 6, ordered best-first). Pass each " +
        "lens's ref from a prior queryLenses/searchLensByName/myFavorites result and its reason, which is " +
        "shown on the lens's card. Call it once per group.",
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
      }),
      execute: ({ picks }) => recommendLenses(mount, locale, picks, tBrand, recalledRefs),
      // The model already has these specs; it gets the refs back so its prose can link them.
      // Requires passing this same ToolSet to convertToModelMessages.
      toModelOutput: ({ output }) => ({
        type: "text",
        value:
          `Rendered ${output.recommendations.length} recommendation card(s) to the user, for: ` +
          output.recommendations.map((rec) => lensRef(rec.id)).join(", ") +
          ". The user reads each card's reason there; your text frames the choice rather than restating each card.",
      }),
    }),

    listLenses: tool({
      description:
        "Lay out already-recalled lenses as a spec table; their names link to each lens's " +
        "page. Pass refs from a prior queryLenses/searchLensByName/myFavorites result.",
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
      // Same as recommendLenses: refs back for linking; needs this ToolSet in convertToModelMessages.
      toModelOutput: ({ output }) => ({
        type: "text",
        value:
          `Rendered a table of ${output.lenses.length} lens(es) to the user, for: ` +
          output.lenses.map((lens) => lensRef(lens.id)).join(", "),
      }),
    }),

    skill: tool({
      description:
        "Read a reference document by name. terms: how to read Atlens spec fields and lens model names; " +
        "read it before explaining what a spec value means or what a code in a lens name stands for.",
      inputSchema: z.object({ name: z.enum(SKILL_NAMES) }),
      execute: ({ name }) => ({ text: readSkill(name, locale) }),
    }),

    siteInfo: tool({
      description:
        "Facts about Atlens and about you — the site, its story, data and prices, collections, what you can do, accounts, privacy — and the only source " +
        "for answering questions about them. Ask for every topic the question touches in one call.",
      inputSchema: z.object({ topics: z.array(z.enum(SITE_TOPICS)).min(1) }),
      execute: ({ topics }) => ({ topics: siteFacts(topics, locale, mount) }),
    }),

    // A client tool: the browser shows the gear card and returns what the user did.
    [ASK_FOR_GEAR]: tool({
      description:
        "Show the user a card to add the camera bodies and lenses they own, before recommending, as the user-gear " +
        "note describes. List any lens or body they mentioned so the card can prefill it. The turn waits for the " +
        "result: saved (gear now in the note), skipped, or not_signed_in (a guest chose to tell you in chat instead of " +
        "signing in); the user-gear note then says how to go on.",
      inputSchema: gearRequestInputSchema,
      outputSchema: gearRequestOutputSchema,
    }),
  };
}
