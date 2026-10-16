import {
  isZoom,
  leadingValue,
  lensHasFeature,
  sortLenses,
  type FilterFeatureKey,
  type SortKey,
} from "@/lib/lens/lens";
import { focalEquiv, lensDisplayName } from "@/lib/lens/format";
import { getLensesByMount } from "@/lib/lens/data";
import { lensRef, buildRefIndex } from "@/lib/ai/lens-ref";
import { deriveSpecialty } from "@/lib/lens/specialty";
import { pickPriceEntry } from "@/lib/lens/pricing";
import { SPEC_NA } from "@/lib/types";
import type { ApertureValue, Lens, Mount, OpticalTrait } from "@/lib/types";

// Hidden unless named in `opticalTraits`. Macro is absent: a macro lens is a valid everyday pick.
const SPECIALTY_TRAITS: readonly OpticalTrait[] = [
  "fisheye",
  "tilt",
  "shift",
  "anamorphic",
  "probe",
];

export type SortField =
  | "reach"
  | "wideEnd"
  | "weightG"
  | "maxAperture"
  | "length"
  | "price"
  | "magnification"
  | "zoomRatio"
  | "releaseYear";

// Direction is baked into each name: with a separate direction parameter the model asked for
// "most versatile" as zoomRatio ascending and got the least versatile lenses.
export const RECALL_SORTS = {
  widest: ["wideEnd", "asc"],
  longestReach: ["reach", "desc"],
  lightest: ["weightG", "asc"],
  heaviest: ["weightG", "desc"],
  fastest: ["maxAperture", "asc"],
  mostCompact: ["length", "asc"],
  cheapest: ["price", "asc"],
  priciest: ["price", "desc"],
  mostMagnification: ["magnification", "desc"],
  widestZoomRange: ["zoomRatio", "desc"],
  newest: ["releaseYear", "desc"],
  oldest: ["releaseYear", "asc"],
} as const satisfies Record<string, readonly [SortField, "asc" | "desc"]>;

export type RecallSort = keyof typeof RECALL_SORTS;
export const RECALL_SORT_NAMES = Object.keys(RECALL_SORTS) as [RecallSort, ...RecallSort[]];

const DEFAULT_SORT: RecallSort = "widest";

export const LENS_TABLE_COLUMNS = [
  "focalEquiv",
  "focalNative",
  "aperture",
  "weight",
  "price",
  "magnification",
  "minFocusDistance",
  "focus",
  "apertureRing",
  "wr",
  "filterThread",
  "releaseYear",
] as const;
export type LensTableColumn = (typeof LENS_TABLE_COLUMNS)[number];

// Aperture is already in the lens name, the first column.
const DEFAULT_TABLE_COLUMNS: LensTableColumn[] = ["focalEquiv", "weight", "price"];

export interface LensConstraints {
  brands?: string[];
  type?: "prime" | "zoom";
  focus?: "auto" | "manual";
  usage?: "photo" | "cine";
  features?: FilterFeatureKey[];
  opticalTraits?: OpticalTrait[];
  // Focal fields are native mm, the number printed on the lens.
  coversFocals?: number[];
  focalWithin?: { min?: number; max?: number };
  minReach?: number;
  maxWide?: number;
  maxWeightG?: number;
  maxLengthMm?: number;
  maxApertureF?: { wide?: number; tele?: number };
  // In the locale's currency (zh → CNY, en → USD).
  maxPrice?: number;
  minMagnification?: number;
  minApertureBladeCount?: number;
  minReleaseYear?: number;
  sortBy?: RecallSort;
}

// officialLink, both angle-of-view forms, and compatibleMounts are left out: nothing read
// them, and they were a fifth of the payload the model re-reads on every step.
export type ResolvedLens = Pick<
  Lens,
  | "id"
  | "mount"
  | "generation"
  | "minAperture"
  | "maxTStop"
  | "minTStop"
  | "apertureBladeCount"
  | "apertureRing"
  | "af"
  | "focusMotor"
  | "internalFocusing"
  | "minFocusDistance"
  | "ois"
  | "oisStops"
  | "wr"
  | "powerZoom"
  | "internalZoom"
  | "diameterMm"
  | "length"
  | "filterMm"
  | "lensMaterial"
  | "lensConfiguration"
  | "releaseYear"
  | "accessories"
  | "fieldNotes"
> & {
  // Raw brand/series/model are not exposed, so the model cannot reassemble names inconsistently.
  name: string;
  focalNativeMm: [number, number];
  focalEquivMm: [number, number];
  maxAperture: ApertureValue | null;
  weightG: number | null;
  magnification: number | null;
  opticalTraits: OpticalTrait[];
  isCine: boolean;
  // sampledAt and source tell the model this is a sample, not a live quote.
  price: {
    amount: number;
    currency: "CNY" | "USD";
    condition: "new" | "used";
    sampledAt: string;
    source: string;
  } | null;
};

// Every recalled lens is re-read on each later step, so the long tail is left to lensDetails.
export type RecalledLens = Pick<
  ResolvedLens,
  | "name"
  | "mount"
  | "focalNativeMm"
  | "focalEquivMm"
  | "maxAperture"
  | "weightG"
  | "length"
  | "price"
  | "af"
  | "ois"
  | "oisStops"
  | "wr"
  | "apertureRing"
  | "magnification"
  | "minFocusDistance"
  | "opticalTraits"
  | "isCine"
  | "releaseYear"
> & { ref: string };

export function toRecalled(lens: ResolvedLens): RecalledLens {
  return {
    // Never the id as well: the model extends patterned ids into lenses it never recalled.
    ref: lensRef(lens.id),
    name: lens.name,
    mount: lens.mount,
    focalNativeMm: lens.focalNativeMm,
    focalEquivMm: lens.focalEquivMm,
    maxAperture: lens.maxAperture,
    weightG: lens.weightG,
    length: lens.length,
    price: lens.price,
    af: lens.af,
    ois: lens.ois,
    oisStops: lens.oisStops,
    wr: lens.wr,
    apertureRing: lens.apertureRing,
    magnification: lens.magnification,
    minFocusDistance: lens.minFocusDistance,
    opticalTraits: lens.opticalTraits,
    isCine: lens.isCine,
    releaseYear: lens.releaseYear,
  };
}

export type DetailedLens = Omit<ResolvedLens, "id"> & { ref: string };

export function toDetailed(lens: ResolvedLens): DetailedLens {
  const { id, ...rest } = lens;
  return { ref: lensRef(id), ...rest };
}

export type Recommendation = ResolvedLens & { reason: string };

export interface RecommendationGroup {
  title: string | null;
  recommendations: Recommendation[];
}

// A "56" request still catches a 55mm lens.
const FOCAL_MATCH_TOLERANCE = 0.1;

export interface RecallResult {
  matches: RecalledLens[];
  maybe: { lens: RecalledLens; missingFields: string[] }[];
  totalMatched: number;
  totalMaybe: number;
}

type Verdict =
  | { kind: "match" }
  | { kind: "exclude" }
  | { kind: "maybe"; missingFields: string[] };

const EXCLUDE: Verdict = { kind: "exclude" };

function evaluate(lens: Lens, c: LensConstraints, locale: string): Verdict {
  if (c.brands?.length && !c.brands.includes(lens.brand)) {
    return EXCLUDE;
  }
  if (c.type && c.type !== (isZoom(lens) ? "zoom" : "prime")) {
    return EXCLUDE;
  }
  if (c.focus === "auto" && !lens.af) {
    return EXCLUDE;
  }
  if (c.focus === "manual" && lens.af) {
    return EXCLUDE;
  }

  const { isCine, opticalTraits } = deriveSpecialty(lens);
  const usage = c.usage ?? "photo";
  if (usage === "photo" && isCine) {
    return EXCLUDE;
  }
  if (usage === "cine" && !isCine) {
    return EXCLUDE;
  }

  const requested = c.opticalTraits ?? [];
  if (requested.length && !requested.some((t) => opticalTraits.includes(t))) {
    return EXCLUDE;
  }
  for (const trait of opticalTraits) {
    if (SPECIALTY_TRAITS.includes(trait) && !requested.includes(trait)) {
      return EXCLUDE;
    }
  }

  if (c.features?.length) {
    for (const field of c.features) {
      if (!lensHasFeature(lens, field)) {
        return EXCLUDE;
      }
    }
  }

  // Native, not equivalent: crop-factor rounding made a 56mm prime miss an "85 equiv" request.
  const nativeMin = lens.focalLengthMin;
  const nativeMax = lens.focalLengthMax;
  if (c.coversFocals?.length) {
    for (const point of c.coversFocals) {
      if (!(nativeMin * (1 - FOCAL_MATCH_TOLERANCE) <= point && point <= nativeMax * (1 + FOCAL_MATCH_TOLERANCE))) {
        return EXCLUDE;
      }
    }
  }
  if (c.focalWithin) {
    const { min: lo, max: hi } = c.focalWithin;
    if (lo != null && nativeMin < lo) {
      return EXCLUDE;
    }
    if (hi != null && nativeMax > hi) {
      return EXCLUDE;
    }
  }
  if (c.minReach != null && nativeMax < c.minReach * (1 - FOCAL_MATCH_TOLERANCE)) {
    return EXCLUDE;
  }
  if (c.maxWide != null && nativeMin > c.maxWide * (1 + FOCAL_MATCH_TOLERANCE)) {
    return EXCLUDE;
  }

  if (c.maxLengthMm != null && lens.length.mm > c.maxLengthMm) {
    return EXCLUDE;
  }

  const missingFields: string[] = [];

  if (c.maxWeightG != null) {
    const weight = leadingValue(lens.weightG);
    if (weight == null) {
      missingFields.push("weightG");
    } else if (weight > c.maxWeightG) {
      return EXCLUDE;
    }
  }

  if (c.maxApertureF) {
    if (lens.maxAperture == null) {
      missingFields.push("maxAperture");
    } else {
      const [wideF, teleF] = apertureEnds(lens.maxAperture);
      if (c.maxApertureF.wide != null && wideF > c.maxApertureF.wide) {
        return EXCLUDE;
      }
      if (c.maxApertureF.tele != null && teleF > c.maxApertureF.tele) {
        return EXCLUDE;
      }
    }
  }

  if (c.maxPrice != null) {
    const selection = pickPriceEntry(lens.pricing, locale);
    if (!selection) {
      missingFields.push("price");
    } else if (selection.entry.price > c.maxPrice) {
      return EXCLUDE;
    }
  }

  if (c.minMagnification != null) {
    const mag = lens.maxMagnification?.value;
    if (mag == null) {
      missingFields.push("maxMagnification");
    } else if (mag < c.minMagnification) {
      return EXCLUDE;
    }
  }

  if (c.minApertureBladeCount != null) {
    const blades = lens.apertureBladeCount;
    if (blades == null) {
      missingFields.push("apertureBladeCount");
    } else if (blades === SPEC_NA || blades < c.minApertureBladeCount) {
      return EXCLUDE;
    }
  }

  if (c.minReleaseYear != null) {
    if (lens.releaseYear == null) {
      missingFields.push("releaseYear");
    } else if (lens.releaseYear < c.minReleaseYear) {
      return EXCLUDE;
    }
  }

  return missingFields.length > 0 ? { kind: "maybe", missingFields } : { kind: "match" };
}

function apertureEnds(value: ApertureValue): [number, number] {
  return Array.isArray(value) ? [value[0], value[1]] : [value, value];
}

const DELEGATED_SORTS = new Set<SortField>(["weightG", "maxAperture", "length"]);

function recallComparable(lens: Lens, key: SortField, locale: string): number | null {
  switch (key) {
    case "reach":
      return focalEquiv(lens.focalLengthMax, lens.mount);
    case "wideEnd":
      return focalEquiv(lens.focalLengthMin, lens.mount);
    case "zoomRatio":
      return lens.focalLengthMax / lens.focalLengthMin;
    case "price":
      return pickPriceEntry(lens.pricing, locale)?.entry.price ?? null;
    case "magnification":
      return lens.maxMagnification?.value ?? null;
    case "releaseYear":
      return lens.releaseYear ?? null;
    default:
      return null;
  }
}

function sortRecalled(
  lenses: Lens[],
  key: SortField,
  dir: "asc" | "desc",
  locale: string,
): Lens[] {
  if (DELEGATED_SORTS.has(key)) {
    return sortLenses(lenses, key as SortKey, dir);
  }
  return [...lenses].sort((a, b) => {
    const va = recallComparable(a, key, locale);
    const vb = recallComparable(b, key, locale);
    if (va === null) {
      return vb === null ? 0 : 1;
    }
    if (vb === null) {
      return -1;
    }
    const delta = va - vb;
    return dir === "desc" ? -delta : delta;
  });
}

export function resolveLens(
  lens: Lens,
  locale: string,
  tBrand: (brand: string) => string,
): ResolvedLens {
  const selection = pickPriceEntry(lens.pricing, locale);
  const { isCine, opticalTraits } = deriveSpecialty(lens);

  return {
    id: lens.id,
    mount: lens.mount,
    name: lensDisplayName(tBrand(lens.brand), lens.series, lens.model),
    generation: lens.generation,
    focalNativeMm: [lens.focalLengthMin, lens.focalLengthMax],
    focalEquivMm: [
      focalEquiv(lens.focalLengthMin, lens.mount),
      focalEquiv(lens.focalLengthMax, lens.mount),
    ],
    maxAperture: lens.maxAperture ?? null,
    minAperture: lens.minAperture,
    maxTStop: lens.maxTStop,
    minTStop: lens.minTStop,
    apertureBladeCount: lens.apertureBladeCount,
    apertureRing: lens.apertureRing,
    af: lens.af,
    focusMotor: lens.focusMotor,
    internalFocusing: lens.internalFocusing,
    minFocusDistance: lens.minFocusDistance,
    magnification: lens.maxMagnification?.value ?? null,
    ois: lens.ois,
    oisStops: lens.oisStops,
    wr: lens.wr,
    powerZoom: lens.powerZoom,
    internalZoom: lens.internalZoom,
    weightG: leadingValue(lens.weightG) ?? null,
    diameterMm: lens.diameterMm,
    length: lens.length,
    filterMm: lens.filterMm,
    lensMaterial: lens.lensMaterial,
    lensConfiguration: lens.lensConfiguration,
    opticalTraits,
    isCine,
    releaseYear: lens.releaseYear,
    accessories: lens.accessories,
    fieldNotes: lens.fieldNotes,
    price: selection
      ? {
          amount: selection.entry.price,
          currency: selection.entry.currency,
          condition: selection.condition,
          sampledAt: selection.entry.sampledAt,
          source: selection.entry.source,
        }
      : null,
  };
}

export function recallLenses(
  mount: Mount,
  locale: string,
  constraints: LensConstraints,
  tBrand: (brand: string) => string,
  maxCount: number,
): RecallResult {
  const lenses = getLensesByMount(mount, locale);
  const matched: Lens[] = [];
  const maybe: { lens: Lens; missingFields: string[] }[] = [];

  for (const lens of lenses) {
    const verdict = evaluate(lens, constraints, locale);
    if (verdict.kind === "match") {
      matched.push(lens);
    } else if (verdict.kind === "maybe") {
      maybe.push({ lens, missingFields: verdict.missingFields });
    }
  }

  const [key, dir] = RECALL_SORTS[constraints.sortBy ?? DEFAULT_SORT];
  const sortedMatched = sortRecalled(matched, key, dir, locale);
  const sortedMaybe = sortRecalled(
    maybe.map((m) => m.lens),
    key,
    dir,
    locale,
  );
  const missingById = new Map(maybe.map((m) => [m.lens.id, m.missingFields]));

  return {
    matches: sortedMatched
      .slice(0, maxCount)
      .map((lens) => toRecalled(resolveLens(lens, locale, tBrand))),
    maybe: sortedMaybe.slice(0, maxCount).map((lens) => ({
      lens: toRecalled(resolveLens(lens, locale, tBrand)),
      missingFields: missingById.get(lens.id) ?? [],
    })),
    totalMatched: matched.length,
    totalMaybe: maybe.length,
  };
}

export function recommendLenses(
  mount: Mount,
  locale: string,
  groups: { title?: string; picks: { ref: string; reason: string }[] }[],
  tBrand: (brand: string) => string,
  recalledRefs: Set<string>,
): { groups: RecommendationGroup[] } {
  const byRef = buildRefIndex(getLensesByMount(mount, locale));
  // The SDK returns a throw to the model as a tool error, so it recalls the lens and retries.
  const resolve = (picks: { ref: string; reason: string }[]) =>
    picks.map((pick) => {
      if (!recalledRefs.has(pick.ref)) {
        throw new Error(
          `Lens ref "${pick.ref}" was not returned by any queryLenses/searchLensByName/myFavorites ` +
            `call in this conversation. Recommend only lenses you've recalled — look it up first, ` +
            `and pass the ref exactly as it appears.`,
        );
      }
      const lens = byRef.get(pick.ref);
      if (!lens) {
        throw new Error(`Unknown lens ref "${pick.ref}".`);
      }
      return { ...resolveLens(lens, locale, tBrand), reason: pick.reason };
    });
  return {
    groups: groups.map((group) => ({
      title: group.title?.trim() || null,
      recommendations: resolve(group.picks),
    })),
  };
}

export function listLenses(
  mount: Mount,
  locale: string,
  refs: string[],
  columns: LensTableColumn[] | undefined,
  caption: string | undefined,
  tBrand: (brand: string) => string,
  recalledRefs: Set<string>,
): { lenses: ResolvedLens[]; columns: LensTableColumn[]; caption: string | null } {
  const byRef = buildRefIndex(getLensesByMount(mount, locale));
  const seen = new Set<string>();
  const lenses: ResolvedLens[] = [];
  for (const ref of refs) {
    if (seen.has(ref)) {
      continue;
    }
    seen.add(ref);
    if (!recalledRefs.has(ref)) {
      throw new Error(
        `Lens ref "${ref}" was not returned by any queryLenses/searchLensByName/myFavorites call ` +
          `in this conversation. Table only lenses you've recalled — look it up first, and pass ` +
          `the ref exactly as it appears.`,
      );
    }
    const lens = byRef.get(ref);
    if (!lens) {
      throw new Error(`Unknown lens ref "${ref}".`);
    }
    lenses.push(resolveLens(lens, locale, tBrand));
  }
  return {
    lenses,
    columns: columns && columns.length > 0 ? columns : DEFAULT_TABLE_COLUMNS,
    caption: caption ?? null,
  };
}
