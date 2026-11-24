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
  RECALL_OMITTED_NOTE,
  LENS_TABLE_COLUMNS,
} from "@/lib/ai/recall";
import { lensRef, buildRefIndex, sourceRef } from "@/lib/ai/lens-ref";
import { groupLensImages } from "@/lib/askiris/lens-image-galleries";
import { figureLabel } from "@/lib/ai/figure-label";
import { LENS_TABLE_RENDERERS, tableLabelsForLocale } from "@/lib/ai/lens-table-cells";
import { groupMtfCharts, type MtfChart } from "@/lib/ai/mtf-comparison";
import { lensDetailImages, lensImageRequestsSchema, MAX_IMAGES_PER_CALL, type LensDetailDisplayImage, type LensImageEntry } from "@/lib/ai/lens-detail-images";
import { OPTICAL_TRAITS, type ApertureValue, type Mount } from "@/lib/types";
import { ASK_FOR_GEAR, gearRequestInputSchema, gearRequestOutputSchema } from "@/lib/ai/gear-request";
import { ASK_CHOICES, choiceRequestInputSchema, choiceRequestOutputSchema } from "@/lib/ai/choice-request";
import { SITE_TOPICS, siteFacts } from "@/lib/site-facts";
import { SPEC_GUIDE } from "@/lib/ai/spec-guide";
import { fillUiStrings } from "@/lib/ui-strings";
import { bodyQuerySchema, queryBodies } from "@/lib/body/query";
import { favoritesOnMount } from "@/lib/ai/favorites";
import type { GearSummary } from "@/lib/ai/gear-context";
import { REVIEW_ASPECTS } from "@/lib/lens/reviews";
import { prepareFeedback, prepareFeedbackInputSchema } from "@/lib/feedback/prepare-feedback";
import type { LensReviews } from "@/lib/lens/reviews-repository";

const RECALL_LIMIT = 20;

// A model fills an unset bound with 0, which no requirement ever means; the message tells it to retry with null.
const bound = () => z.number().positive("A bound must be a positive number. Use null, not 0, for an unrestricted bound.");

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
    .array(bound())
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
    .object({ min: bound().nullish(), max: bound().nullish() })
    .nullish()
    .describe(
      "Native focal window in mm (the number printed on the lens, not the full-frame " +
        "equivalent); an omitted end is open. The lens's ENTIRE focal range must lie inside it.",
    ),
  minReach: bound()
    .nullish()
    .describe("Native mm; a hard lower bound on the lens's longest focal length (its tele end)."),
  maxWide: bound()
    .nullish()
    .describe("Native mm; a hard upper bound on the lens's shortest focal length (its wide end)."),
  maxWeightG: bound()
    .nullish()
    .describe("Grams; a hard upper bound on lens weight."),
  maxLengthMm: bound()
    .nullish()
    .describe("Barrel length ceiling in mm; a hard upper bound."),
  maxApertureF: z
    .object({ wide: bound().nullish(), tele: bound().nullish() })
    .nullish()
    .describe(
      "f-number ceiling at each zoom end (smaller = wider); a hard bound.",
    ),
  maxPrice: bound()
    .nullish()
    .describe("Price ceiling in the user's currency (CNY for zh, USD for en)."),
  minMagnification: bound()
    .nullish()
    .describe(
      "Minimum magnification ratio (1 = life-size); a hard lower bound.",
    ),
  minApertureBladeCount: bound()
    .nullish()
    .describe(
      "Minimum aperture blade count; a hard lower bound.",
    ),
  minReleaseYear: bound()
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
  // Compatibility: replies saved before searchLensByName took several names hold `results` as a flat
  // list of lenses. Drop the `ref` branch once no saved conversation predates that change (stored
  // conversations have no retention limit, so until a migration rewrites them).
  searchLensByName: (output: { results?: ({ matches?: RefList; ref?: unknown })[] }) =>
    (output.results ?? []).flatMap((entry) => entry.matches ? entry.matches.map((lens) => lens.ref) : [entry.ref]),
  myFavorites: (output: { results?: RefList }) => (output.results ?? []).map((lens) => lens.ref),
  myGear: (output: { lenses?: RefList }) => (output.lenses ?? []).map((lens) => lens.ref),
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
 * The figure numbers already used by the assistant message this request continues: a sign-in pause
 * resumes the same message in a new request, and its numbering must carry on rather than restart.
 */
export function countShownFigures(messages: UIMessage[]): number {
  const last = messages.at(-1);
  if (last?.role !== "assistant") {return 0;}
  return last.parts.reduce((total, part) => {
    if (!isToolUIPart(part) || getToolName(part) !== "showLensImages" || part.state !== "output-available") {return total;}
    return total + ((part.output as { displayImages?: unknown[] } | null)?.displayImages?.length ?? 0);
  }, 0);
}

/** How many earlier lenses' MTF charts join a comparison, most recently shown first. */
const EARLIER_MTF_LENSES = 3;

/**
 * The MTF charts shown by showLensImages earlier in the conversation, oldest first, each named the way
 * this reply can refer to it: by figure label when it is in the assistant message a resumed turn
 * continues, otherwise by imageRef (figure numbers restart every reply).
 */
export function earlierMtfCharts(messages: UIMessage[]): MtfChart[] {
  const charts: MtfChart[] = [];
  messages.forEach((message, index) => {
    const sameReply = index === messages.length - 1 && message.role === "assistant";
    for (const part of message.parts) {
      if (!isToolUIPart(part) || getToolName(part) !== "showLensImages" || part.state !== "output-available") {continue;}
      const output = part.output as { displayImages?: LensDetailDisplayImage[]; lenses?: { ref: string; maxAperture?: ApertureValue | null; focalNativeMm?: [number, number] }[] } | null;
      for (const shown of output?.displayImages ?? []) {
        if (shown.image.role !== "mtf") {continue;}
        const lens = output?.lenses?.find(({ ref }) => ref === shown.lensRef);
        charts.push({
          lensRef: shown.lensRef,
          maxAperture: lens?.maxAperture ?? null,
          zoom: lens?.focalNativeMm ? lens.focalNativeMm[0] !== lens.focalNativeMm[1] : false,
          image: shown.image,
          name: sameReply && shown.figureLabel ? shown.figureLabel : `${shown.imageRef} (shown in an earlier reply)`,
        });
      }
    }
  });
  return charts;
}

/** Data the tools read beyond the catalogue: the user's account and the review store. */
export interface ToolData {
  /** Favorite lens ids, newest first, or null for a guest. */
  favorites: () => Promise<string[] | null>;
  gear: () => Promise<GearSummary>;
  /** Review claims by lens id; a lens without any is absent. */
  reviews: (lensIds: string[]) => Promise<Map<string, LensReviews>>;
}

// Iris writes in the user's language from the English; the Chinese copy is for lens pages.
function withoutChinese<T extends { textZh?: string }>(value: T): Omit<T, "textZh"> {
  const copy = { ...value };
  delete copy.textZh;
  return copy;
}

// Returned with every lensReviews result, so the reading rules arrive with the data they govern.
const REVIEWS_NOTE =
  "Each claim summarizes the reviews it cites; it is not Atlens's own testing. Say how many reviews back it " +
  "(reviewCount, outletCount), and who says what when agreement is conflict or basis_differs. On measurable " +
  "aspects, measured reviews outrank hands_on ones. An otherMount claim was tested on another mount's version: " +
  "say so, and use it as reference only. staleness names the only reviews whose body-dependent finding may not " +
  "hold on current bodies, each with its reason: attribute age or an unstated body to those reviews alone, and " +
  "weigh it against the user's camera. An aspect with no claim has no review findings anywhere on Atlens: say so " +
  "rather than judge it yourself or point to another Atlens page. Never write a review's url: the source " +
  "links turn into numbered notes that open it.";

// Returned with every queryLenses result, so the reading rules arrive with the data they govern.
const QUERY_LENSES_NOTE =
  "`maybe` holds lenses with no data on a constrained or sorted field: surface them, never drop them. " +
  `Each query returns at most ${RECALL_LIMIT} lenses by your sort; totalMatched counts the matches beyond that, and ` +
  "there is no paging. Lenses you put forward for the user to choose from go on cards or a table; prose alone " +
  "does not show them.";

// Returned with every queryBodies result, so the boundary arrives with the data it governs.
const BODIES_NOTE =
  "Discontinued bodies are included and say so. `maybe` holds bodies with no figure for a filtered field: " +
  "surface them, never drop them. A field in a record's notInData is not in the catalogue: say so, never guess it. " +
  "The catalogue holds specs only: no prices, reviews, test results or buying advice for bodies. Asked for any of " +
  "those, say Atlens has none and stop at the specs; do not judge a body's worth, handling or image quality from memory.";

// What one call returns at most; longer lists are cut, not rejected, so the model needs no retry.
const MAX_DETAIL_REFS = 6;
const MAX_REVIEW_REFS = 6;

function capRefs(refs: string[], limit: number): { kept: string[]; notReturned?: { refs: string[]; note: string } } {
  if (refs.length <= limit) {
    return { kept: refs };
  }
  const omitted = refs.slice(limit);
  return {
    kept: refs.slice(0, limit),
    notReturned: {
      refs: omitted,
      note: `Only the first ${limit} refs are returned per call. Call again with these for the rest, if the answer needs them.`,
    },
  };
}

/**
 * `recalledRefs` gates every tool that takes a ref; the recall tools add to it, and
 * `seedRecalledRefs` adds the refs they returned earlier in the conversation.
 */
// Options are keyed by provider, and a provider reads only its own key: the OpenAI-compatible
// providers (Qwen, GLM, OpenRouter) take no per-image option and fetch the URL as is.
const IMAGE_READING_OPTIONS = { deepseek: { imageDetail: "original" }, openai: { imageDetail: "high" } };

export function buildLensTools(
  mount: Mount,
  locale: string,
  tBrand: (brand: string) => string,
  data: ToolData,
  recalledRefs: Set<string>,
  // Filled with the next figure number once the history is resolved, like recalledRefs.
  // `mtfShown` holds the MTF charts shown earlier in the conversation and in this request, oldest first.
  figures: { next: number; mtfShown?: MtfChart[] } = { next: 1 },
) {
  const mountLabel = mount === "G" ? "Fujifilm GFX" : "Fujifilm X";
  const contextRefs = buildRefIndex(getLensesByMount(mount, locale));
  const recalledLenses = (refs: string[]) => {
    const byRef = contextRefs;
    return refs.map((ref) => {
      if (!recalledRefs.has(ref)) {
        throw new Error(
          `Lens ref "${ref}" was not returned by a recall tool ` +
            `in this conversation. Look it up first, and pass the ref exactly as it appears.`,
        );
      }
      const lens = byRef.get(ref);
      if (!lens) {
        throw new Error(`Unknown lens ref "${ref}".`);
      }
      return lens;
    });
  };

  // One gear snapshot per request; a guest or a failed read marks nothing and never raises.
  const markOwned = async <T extends { id: string }>(lenses: T[]): Promise<(T & { owned?: true })[]> => {
    const gear = await data.gear().catch(() => null);
    const owned = new Set(gear?.known ? gear.lenses.flatMap((lens) => lens.ref ? [lens.ref] : []) : []);
    return lenses.map((lens) => owned.has(lensRef(lens.id)) ? { ...lens, owned: true } : lens);
  };

  return {
    queryLenses: tool({
      description:
        "Find lenses by spec in the current mount only. Set hard constraints only for user requirements; " +
        "omit or use null for unrestricted fields. Batch independent searches in one call, one query each.",
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
          return result.totalMatched === 0 && result.totalMaybe === 0
            ? {
                ...result,
                note: `No catalogue lenses meet these constraints in ${mountLabel}. Say so. Do not relax explicit requirements without the user's agreement. If the user appears to mean a different mount, confirm that instead of searching wider.`,
              }
            : result;
        }),
        note: QUERY_LENSES_NOTE,
        detailSpecsNote: RECALL_OMITTED_NOTE,
      }),
    }),

    searchLensByName: tool({
      description:
        "Look up the models or brands the user named, in the current mount only: one call for all of them. " +
        "Use queryLenses for spec searches.",
      inputSchema: z.object({
        queries: z
          .array(z.string())
          .min(1)
          .max(4)
          .describe(
            "One identifier per lens or brand, extracted from the request — a short name or number " +
              "token each, matched against a name index. Not a full sentence. Results come back in the same order.",
          ),
        limit: z.number().optional().describe("Max results per query (default 8)."),
      }),
      execute: ({ queries, limit }) => {
        const index = buildLensSearchIndex(getLensesByMount(mount, locale));
        return {
          results: queries.map((query) => {
            const matches = searchLensIndex(index, query, limit ?? 8).map((lens) =>
              toRecalled(resolveLens(lens, locale, tBrand)),
            );
            for (const lens of matches) {
              recalledRefs.add(lens.ref);
            }
            return matches.length ? { query, matches } : {
              query,
              matches,
              note: `No name match in ${mountLabel}. This lookup does not search across mounts. If the name points to a different mount, confirm which one the user means.`,
            };
          }),
          detailSpecsNote: RECALL_OMITTED_NOTE,
        };
      },
    }),

    myFavorites: tool({
      description:
        "The lenses the user saved as favorites, newest first, on the current mount. Call it when the user " +
        "refers to lenses they favorited or saved. The refs work with every other tool, like a recall result.",
      inputSchema: z.object({}),
      execute: async () => {
        const ids = await data.favorites();
        // Unreachable through the sign-in gate, which pauses a guest's call until they sign in.
        if (ids === null) {
          throw new Error("The user is not signed in.");
        }
        const { lenses, otherMounts } = favoritesOnMount(ids, mount, locale);
        const results = lenses.slice(0, RECALL_LIMIT).map((lens) => toRecalled(resolveLens(lens, locale, tBrand)));
        for (const lens of results) {
          recalledRefs.add(lens.ref);
        }
        return { results, total: lenses.length, otherMounts, detailSpecsNote: RECALL_OMITTED_NOTE };
      },
    }),

    myGear: tool({
      description:
        "Read the user's current saved camera bodies and lenses, before gear-dependent advice or a new question " +
        "that needs their current profile. Earlier results may be stale. An empty profile is not an edit request.",
      inputSchema: z.object({}),
      execute: async () => {
        const gear = await data.gear();
        if (!gear.known && gear.reason !== "empty") {
          throw new Error(gear.reason === "guest" ? "The user is not signed in." : "The user's gear could not be read.");
        }
        const { bodies, lenses } = gear.known ? gear : { bodies: [], lenses: [] };
        for (const lens of lenses) {
          if (!lens.manual && lens.ref && contextRefs.has(lens.ref)) {recalledRefs.add(lens.ref);}
        }
        return { bodies, lenses };
      },
    }),

    lensDetails: tool({
      description: "Look up specs for recalled lenses.",
      inputSchema: z.object({
        lenses: z.array(z.object({
          ref: z.string().describe("Lens ref from an earlier recall result."),
        })).min(1).describe(`At most ${MAX_DETAIL_REFS} lenses are returned per call.`),
      }),
      execute: ({ lenses }) => {
        const { kept, notReturned } = capRefs(lenses.map(({ ref }) => ref), MAX_DETAIL_REFS);
        return {
          lenses: recalledLenses(kept).map((lens) => toDetailed(resolveLens(lens, locale, tBrand))),
          notInData: "For field performance and opinions, use lensReviews.",
          ...(notReturned ? { notReturned } : {}),
        };
      },
    }),

    showLensImages: tool({
      description: "Show the user product photos, MTF charts or optical diagrams of recalled lenses, and read them. Show images when the user asks to see or interpret them, and attach the optical diagram when answering how many elements or groups or which special elements a lens has. Otherwise do not show images unasked; MTF charts are not a way to answer which lens is sharper. Optical diagrams illustrate the construction; element and group counts come from lensDetails specs. Use an image ref to show one specific image.",
      inputSchema: z.object({
        lenses: z.array(z.object({
          ref: z.string().describe("Lens ref from an earlier recall result."),
          images: lensImageRequestsSchema.describe("Images to show for this lens. Lens search constraints are not chart test conditions."),
        })).min(1).describe(`At most ${MAX_DETAIL_REFS} lenses are returned per call.`),
      }),
      execute: ({ lenses }) => {
        const { kept, notReturned } = capRefs(lenses.map(({ ref }) => ref), MAX_DETAIL_REFS);
        const displayImages: LensImageEntry[] = [];
        const lensOutputs = recalledLenses(kept).map((lens, index) => {
          const { name, maxAperture, focalNativeMm } = resolveLens(lens, locale, tBrand);
          const { images, results, displayImages: selected, unservedImages } = lensDetailImages(lens, kept[index], name, lenses.find(({ ref }) => ref === kept[index])?.images, MAX_IMAGES_PER_CALL - displayImages.length);
          displayImages.push(...selected);
          return {
            ref: kept[index], name, maxAperture, focalNativeMm, images,
            ...(results.length ? { imageResults: results } : {}),
            ...(unservedImages.length ? { unservedImages, unservedNote: "These image types exist for this lens but are not served here; they are on the lens's page." } : {}),
          };
        });
        const labelled = displayImages.map((entry) => {
          const figure = figures.next++;
          return { ...entry, figure, figureLabel: figureLabel(locale, figure) };
        });
        // Charts of this call, plus the most recently shown other lenses', so a follow-up can be compared.
        const shownNow: MtfChart[] = labelled.filter(({ image }) => image.role === "mtf").map(({ lensRef, image, figureLabel: name }) => {
          const lens = lensOutputs.find((entry) => entry.ref === lensRef);
          return { lensRef, image, name, maxAperture: lens?.maxAperture ?? null, zoom: lens ? lens.focalNativeMm[0] !== lens.focalNativeMm[1] : false };
        });
        const shownBefore = figures.mtfShown ?? [];
        const earlierLenses = [...new Set(shownBefore.map(({ lensRef }) => lensRef).reverse())]
          .filter((ref) => !shownNow.some((chart) => chart.lensRef === ref))
          .slice(0, EARLIER_MTF_LENSES);
        const grouping = shownNow.length ? groupMtfCharts([...shownBefore.filter(({ lensRef }) => earlierLenses.includes(lensRef)), ...shownNow]) : undefined;
        figures.mtfShown = [...shownBefore, ...shownNow];
        return {
          lenses: lensOutputs,
          displayImages: labelled,
          ...grouping,
          ...(notReturned ? { notReturned } : {}),
        };
      },
      toModelOutput: ({ output }) => {
        const { displayImages, ...details } = output;
        const presentation = {
          galleries: groupLensImages(displayImages).map(([preview, ...rest]) => ({
            lensRef: preview.lensRef,
            role: preview.image.role,
            preview: preview.imageRef,
            imageCount: rest.length + 1,
          })),
        };
        const metadata = {
          ...details,
          presentation,
          imagesForReading: displayImages.map(({ imageRef }) => imageRef),
          ...(displayImages.some(({ figureLabel }) => figureLabel) ? {
            shownImages: displayImages.map(({ figureLabel, imageRef }) => ({ figure: figureLabel, imageRef })),
            figureNote: "The user sees each shown image with its figure label. Refer to shown images by that label, e.g. in prose, not by imageRef.",
          } : {}),
        };
        if (!displayImages.length) {
          return { type: "text", value: JSON.stringify(metadata) };
        }
        const hasMtf = displayImages.some(({ image }) => image.role === "mtf");
        const reading = {
          ...metadata,
          ...(hasMtf ? {
            mtfNote: output.mtfGroups
              ? "Interpret only legible curves. mtfGroups governs how the charts may be compared: values within a group as its level allows, only curve shapes between groups."
              : "Interpret only legible curves. If a chart does not state its test conditions, say so when it affects the answer.",
          } : {}),
        };
        return {
          type: "content",
          value: [
            { type: "text", text: JSON.stringify(reading) },
            ...displayImages.flatMap(({ imageRef, src, figureLabel }) => [
              { type: "text" as const, text: figureLabel ? `Image ${figureLabel} (${imageRef}):` : `Image ${imageRef}:` },
              { type: "file" as const, mediaType: "image/webp", data: { type: "url" as const, url: new URL(src) }, providerOptions: IMAGE_READING_OPTIONS },
            ]),
          ],
        };
      },
    }),

    queryBodies: tool({
      description:
        "Fujifilm camera bodies by spec, or by name when `names` is set. Every filter is a hard constraint, " +
        "so set one only for a requirement the request makes. Renders nothing to the user.",
      inputSchema: bodyQuerySchema,
      execute: (query) => ({ ...queryBodies(query, mount), note: BODIES_NOTE }),
    }),

    lensReviews: tool({
      description:
        "What published reviews say about lenses already in hand, by ref: image quality, focusing, handling, " +
        "build. Call it before describing how a lens performs. Renders nothing to the user.",
      inputSchema: z.object({
        refs: z
          .array(z.string())
          .min(1)
          .describe(
            `Lens refs, each from a prior queryLenses/searchLensByName/myFavorites/myGear result. At most ${MAX_REVIEW_REFS} are returned per call.`,
          ),
        aspects: z
          .array(z.enum(REVIEW_ASPECTS))
          .nullish()
          .describe("Only these aspects; leave out or null for all."),
      }),
      execute: async ({ refs, aspects }) => {
        const { kept, notReturned } = capRefs(refs, MAX_REVIEW_REFS);
        const lenses = recalledLenses(kept);
        const reviews = await data.reviews(lenses.map((lens) => lens.id));
        return {
          lenses: lenses.map((lens) => {
            const found = reviews.get(lens.id);
            // Stored source ids abbreviate the site's name, so the model could guess one it was never given.
            const ref = (id: string) => sourceRef(lens.id, id);
            const claims = (found?.claims ?? [])
              .filter((claim) => !aspects?.length || aspects.includes(claim.aspect))
              .map(withoutChinese)
              .map((claim) => ({
                ...claim,
                sources: claim.sources.map(ref),
                ...(claim.details
                  ? { details: claim.details.map((detail) => ({ ...withoutChinese(detail), id: ref(detail.id) })) }
                  : {}),
                ...(claim.staleness ? { staleness: claim.staleness.map((entry) => ({ ...entry, id: ref(entry.id) })) } : {}),
              }));
            const cited = new Set(
              claims.flatMap((claim) => [...claim.sources, ...(claim.details ?? []).map((detail) => detail.id)]),
            );
            return {
              ref: lensRef(lens.id),
              name: resolveLens(lens, locale, tBrand).name,
              claims,
              sources: (found?.sources ?? [])
                .map((source) => ({ ...source, id: ref(source.id) }))
                .filter((source) => cited.has(source.id)),
            };
          }),
          note: REVIEWS_NOTE,
          ...(notReturned ? { notReturned } : {}),
        };
      },
    }),

    recommendLenses: tool({
      description:
        "Present picks as a grid of recommendation cards (up to 6, ordered best-first). Pass each " +
        "lens's ref from a prior queryLenses/searchLensByName/myFavorites/myGear result and its reason, which is " +
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
      execute: ({ picks }) => {
        const { recommendations } = recommendLenses(mount, locale, picks, tBrand, recalledRefs);
        return markOwned(recommendations).then((marked) => ({ recommendations: marked }));
      },
      // The model already has these specs; it gets the refs back so its prose can link them.
      // Requires passing this same ToolSet to convertToModelMessages.
      toModelOutput: ({ output }) => ({
        type: "text",
        value:
          `Rendered ${output.recommendations.length} recommendation card(s) to the user, for: ` +
          output.recommendations.map((rec) => lensRef(rec.id) + (rec.owned ? " (already owned)" : "")).join(", ") +
          ". The user reads each card's reason there; your text frames the choice rather than restating each card.",
      }),
    }),

    listLenses: tool({
      description:
        "Lay out already-recalled lenses as a spec table; their names link to each lens's " +
        "page. Use lensConfiguration for element and group counts or special glass. Pass recalled refs.",
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
              "user's question. Defaults to equivalent focal length, weight, and price.",
          ),
        caption: z
          .string()
          .optional()
          .describe("An optional short caption above the table, in the user's language."),
      }),
      execute: ({ refs, columns, caption }) => {
        const table = listLenses(mount, locale, refs, columns, caption, tBrand, recalledRefs);
        return markOwned(table.lenses).then((lenses) => ({ ...table, lenses }));
      },
      toModelOutput: ({ output }) => {
        const labels = tableLabelsForLocale(locale);
        return {
        type: "text",
        value: JSON.stringify({ presentation: {
          ...(output.caption ? { caption: output.caption } : {}),
          table: {
            lensRefs: output.lenses.map((lens) => lensRef(lens.id)),
            columns: output.columns,
            // What each cell shows the user, so the model never writes prose that contradicts the table.
            lenses: output.lenses.map((lens) => ({
              ref: lensRef(lens.id),
              name: lens.name,
              ...(lens.owned ? { owned: true } : {}),
              values: Object.fromEntries(output.columns.map((column) => [column, LENS_TABLE_RENDERERS[column](lens, labels) ?? labels.na])),
            })),
          },
        } }),
        };
      },
    }),

    prepareFeedback: tool({
      description:
        "Prepare an editable feedback card for an Atlens issue, suggestion, missing lens, or data correction. " +
        "Use when the user asks to give feedback, or a concrete site issue remains after helping. Does not submit feedback.",
      inputSchema: prepareFeedbackInputSchema,
      execute: (input) => {
        const lens = input.lensRef ? recalledLenses([input.lensRef])[0] : undefined;
        return prepareFeedback(input, lens, locale, lens ? tBrand(lens.brand) : "");
      },
      toModelOutput: () => ({ type: "text", value: "Displayed an editable feedback draft. Nothing has been submitted. The user may submit it or continue chatting." }),
    }),

    readSpecGuide: tool({
      description:
        "Read the guide to interpreting Atlens spec fields and lens model names; " +
        "read it before explaining what a spec value means or what a code in a lens name stands for.",
      inputSchema: z.object({}),
      execute: () => ({ text: fillUiStrings(SPEC_GUIDE.text, locale) }),
    }),

    siteInfo: tool({
      description:
        "Facts about Atlens and about you — the site, its story, data and prices, collections, brand pages, charts, what you can do, accounts, privacy — and the only source " +
        "for answering questions about them. Ask for every topic the question touches in one call.",
      inputSchema: z.object({ topics: z.array(z.enum(SITE_TOPICS)).min(1) }),
      execute: ({ topics }) => ({ topics: siteFacts(topics, locale, mount) }),
    }),

    // A client tool: the browser shows the gear card and returns what the user did.
    [ASK_FOR_GEAR]: tool({
      description:
        "Show the gear editor when the user asks to add or change gear, or a myGear result is empty and " +
        "the recommendation needs gear details. Prefill names the user supplied. Wait for saved, skipped, or " +
        "not_signed_in. Saved names confirm the edit, not a complete profile; read myGear when those facts are needed. " +
        "After a skip or sign-in refusal, continue without another card.",
      inputSchema: gearRequestInputSchema,
      outputSchema: gearRequestOutputSchema,
    }),

    // A client tool: the browser shows the choice card and returns the picks.
    [ASK_CHOICES]: tool({
      description:
        "Ask the user up to three questions as option chips, for questions whose answers are a few short " +
        "choices; set multiple where several can apply. The card adds its own free-text option. The turn waits " +
        "for the result: answered (picked per question, empty where the user left a group alone) or skipped. " +
        "Put the questions in the card only, not in your text; after a skip, go on without asking them again.",
      inputSchema: choiceRequestInputSchema,
      outputSchema: choiceRequestOutputSchema,
    }),
  };
}
