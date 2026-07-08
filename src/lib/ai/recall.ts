import {
  getLensUrl,
  isZoom,
  leadingValue,
  lensHasFeature,
  sortLenses,
  type FilterFeatureKey,
  type SortKey,
} from "@/lib/lens/lens";
import { focalEquiv, lensDisplayName } from "@/lib/lens/format";
import { getLensesByMount } from "@/lib/lens/data";
import { deriveSpecialty } from "@/lib/lens/specialty";
import { pickPriceEntry } from "@/lib/lens/pricing";
import { SPEC_NA } from "@/lib/types";
import type { ApertureValue, Lens, Mount, OpticalTrait } from "@/lib/types";

// Agent recall: LLM constraints → matches / maybe / excluded. Unlike the UX
// filter (filterLenses), it supports numeric thresholds and focal predicates.

// Specialty traits hidden from generic queries; surface only when named in
// `opticalTraits`. Macro is absent — a macro lens is a valid everyday pick.
const SPECIALTY_TRAITS: readonly OpticalTrait[] = [
  "fisheye",
  "tilt",
  "shift",
  "anamorphic",
  "probe",
];

// Recall-local sort axes, NOT the UI's SORT_KEYS — recall needs unambiguous focal
// ends (reach/wideEnd) plus axes the browse UI lacks (magnification, zoomRatio).
export const RECALL_SORT_FIELDS = [
  "reach", // longest focal reach (tele end)
  "wideEnd", // widest focal (wide end)
  "weightG",
  "maxAperture",
  "length",
  "price",
  "magnification",
  "zoomRatio",
  "releaseYear",
] as const;
export type SortField = (typeof RECALL_SORT_FIELDS)[number];

export interface LensConstraints {
  brands?: string[];
  type?: "prime" | "zoom";
  focus?: "auto" | "manual";
  usage?: "photo" | "cine";
  features?: FilterFeatureKey[];
  opticalTraits?: OpticalTrait[];
  // Native millimetres (the number printed on the lens). The lens must be able to
  // shoot at each, matched within a small tolerance.
  coversFocals?: number[];
  // Native millimetres. The lens's whole focal range must sit inside this window.
  focalWithin?: [number | null, number | null];
  maxWeightG?: number;
  // Physical barrel length ceiling in mm (compact / pocketable).
  maxLengthMm?: number;
  // f-number ceilings at each zoom end (a smaller number = wider).
  maxApertureF?: { wide?: number; tele?: number };
  // In the locale's currency (zh → CNY, en → USD).
  maxPrice?: number;
  // Minimum magnification ratio (e.g. 0.5 = at least half life-size). Close-up.
  minMagnification?: number;
  // Minimum aperture blade count (rounder out-of-focus rendering).
  minApertureBladeCount?: number;
  // Only lenses released in or after this year.
  minReleaseYear?: number;
  sortBy?: SortField;
  sortDir?: "asc" | "desc";
}

// The lens as the model and the card see it: a locale-resolved projection of the
// full `Lens`. Locale/pipeline-internal fields (raw pricing/links, translations,
// search aliases, publish bookkeeping) are projected away; price/officialLink are
// flattened to the active locale; every spec field is kept so the model can recall
// and cite the long tail (blades, construction, filter size, dimensions).
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
  | "angleOfView"
  | "angleOfViewCalc"
  | "releaseYear"
  | "compatibleMounts"
  | "accessories"
  | "fieldNotes"
> & {
  // Single canonical display name (brand + series + model, locale-resolved). The
  // model and the card both refer to a lens by this — the raw brand/series/model
  // are NOT exposed, so the model can't reassemble names inconsistently.
  name: string;
  focalNativeMm: [number, number];
  focalEquivMm: [number, number];
  maxAperture: ApertureValue | null;
  weightG: number | null; // flattened from Lens.weightG's range form
  magnification: number | null; // flattened from Lens.maxMagnification
  opticalTraits: OpticalTrait[];
  isCine: boolean;
  // sampledAt (ISO date) + source stamp the price's provenance, so the model reads it
  // as a point-in-time sample from one channel — a rough marker, not a live quote to do
  // exact arithmetic on across differently-sampled lenses.
  price: {
    amount: number;
    currency: "CNY" | "USD";
    condition: "new" | "used";
    sampledAt: string;
    source: string;
  } | null;
  officialLink: string | null;
};

// A resolved lens the model has chosen to recommend, carrying its authored reason.
export type Recommendation = ResolvedLens & { reason: string };

// coversFocals is matched on native mm within this fraction, so a "56" request
// still catches a 55mm lens (same class) and never misses a prime by a hair.
const FOCAL_MATCH_TOLERANCE = 0.1;

export interface RecallResult {
  // Capped to the top `maxCount` (see recallLenses) by the active sort.
  matches: ResolvedLens[];
  maybe: { lens: ResolvedLens; missingFields: string[] }[];
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
  // Positive filter: when traits are requested, the lens must have at least one.
  if (requested.length && !requested.some((t) => opticalTraits.includes(t))) {
    return EXCLUDE;
  }
  // Specialty guard: a lens carrying a specialty trait the user did not ask for
  // never surfaces (a fisheye must not answer "a light lens").
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

  // Native mm — the number the lens is labelled with and the number the user says.
  // The mount is fixed here, so FF-equiv would only add crop-factor rounding that
  // makes a prime miss its own focal (56mm → 84 equiv, and a 85 request excludes it).
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
    const [lo, hi] = c.focalWithin;
    if (lo != null && nativeMin < lo) {
      return EXCLUDE;
    }
    if (hi != null && nativeMax > hi) {
      return EXCLUDE;
    }
  }

  // length is always present, so it's a hard filter (never demotes to maybe).
  if (c.maxLengthMm != null && lens.length.mm > c.maxLengthMm) {
    return EXCLUDE;
  }

  // Numeric thresholds — the only checks that can be indeterminate (missing
  // data). A miss never excludes silently; it demotes the lens to `maybe`.
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
      // SPEC_NA = fixed-aperture lens with no diaphragm — can't meet a blade count.
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

// Keys delegated to the shared UI sorter; comparators reused, not re-implemented.
const DELEGATED_SORTS = new Set<SortField>(["weightG", "maxAperture", "length"]);

// Comparable value for a recall-only sort axis. null = data missing.
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
      return null; // delegated keys never reach here
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
  // Recall-only axes; missing data sorts last regardless of direction.
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
    // identity
    id: lens.id,
    mount: lens.mount,
    name: lensDisplayName(tBrand(lens.brand), lens.series, lens.model),
    generation: lens.generation,
    // focal / field of view
    focalNativeMm: [lens.focalLengthMin, lens.focalLengthMax],
    focalEquivMm: [
      focalEquiv(lens.focalLengthMin, lens.mount),
      focalEquiv(lens.focalLengthMax, lens.mount),
    ],
    angleOfView: lens.angleOfView,
    angleOfViewCalc: lens.angleOfViewCalc,
    // aperture
    maxAperture: lens.maxAperture ?? null,
    minAperture: lens.minAperture,
    maxTStop: lens.maxTStop,
    minTStop: lens.minTStop,
    apertureBladeCount: lens.apertureBladeCount,
    apertureRing: lens.apertureRing,
    // focus
    af: lens.af,
    focusMotor: lens.focusMotor,
    internalFocusing: lens.internalFocusing,
    minFocusDistance: lens.minFocusDistance,
    magnification: lens.maxMagnification?.value ?? null,
    // stabilization / weather
    ois: lens.ois,
    oisStops: lens.oisStops,
    wr: lens.wr,
    // zoom mechanics
    powerZoom: lens.powerZoom,
    internalZoom: lens.internalZoom,
    // physical
    weightG: leadingValue(lens.weightG) ?? null,
    diameterMm: lens.diameterMm,
    length: lens.length,
    filterMm: lens.filterMm,
    lensMaterial: lens.lensMaterial,
    // optics
    lensConfiguration: lens.lensConfiguration,
    opticalTraits,
    isCine,
    // meta
    releaseYear: lens.releaseYear,
    compatibleMounts: lens.compatibleMounts,
    accessories: lens.accessories,
    fieldNotes: lens.fieldNotes,
    // commercial (locale-flattened)
    price: selection
      ? {
          amount: selection.entry.price,
          currency: selection.entry.currency,
          condition: selection.condition,
          sampledAt: selection.entry.sampledAt,
          source: selection.entry.source,
        }
      : null,
    officialLink: getLensUrl(lens, locale) ?? null,
  };
}

export function recallLenses(
  mount: Mount,
  locale: string,
  constraints: LensConstraints,
  tBrand: (brand: string) => string,
  // Cap on matches and maybes returned, applied after the active sort;
  // totalMatched/totalMaybe still report the full pre-cap counts. queryLenses fixes
  // this at RECALL_LIMIT; tests vary it to inspect the full (uncapped) match set.
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

  const key = constraints.sortBy ?? "wideEnd";
  const dir = constraints.sortDir ?? "asc";
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
      .map((lens) => resolveLens(lens, locale, tBrand)),
    maybe: sortedMaybe.slice(0, maxCount).map((lens) => ({
      lens: resolveLens(lens, locale, tBrand),
      missingFields: missingById.get(lens.id) ?? [],
    })),
    totalMatched: matched.length,
    totalMaybe: maybe.length,
  };
}

// Look up lenses by id and resolve them, attaching the model's authored reason.
// recalledIds is every id this turn's tool calls have returned, so a pick outside it
// is a lens the model never recalled here.
export function recommendLenses(
  mount: Mount,
  locale: string,
  picks: { id: string; reason: string }[],
  tBrand: (brand: string) => string,
  recalledIds: Set<string>,
): { recommendations: Recommendation[] } {
  const byId = new Map(getLensesByMount(mount, locale).map((lens) => [lens.id, lens]));
  const recommendations = picks.map((pick) => {
    // Fail loud on a lens the model never recalled — one it conjured from memory or
    // an id it altered. Only ids returned by a queryLenses/searchLensByName call this
    // turn are allowed; the SDK surfaces the throw as a tool-error, so the model
    // recalls the lens and retries with the exact id inside its step budget.
    if (!recalledIds.has(pick.id)) {
      throw new Error(
        `Lens id "${pick.id}" was not returned by any queryLenses/searchLensByName ` +
          `call this turn. Recommend only lenses you've recalled — look it up first, ` +
          `and pass the id exactly as it appears.`,
      );
    }
    const lens = byId.get(pick.id);
    if (!lens) {
      // recalledIds only ever holds ids from real tool results, so this is defensive.
      throw new Error(`Unknown lens id "${pick.id}".`);
    }
    return { ...resolveLens(lens, locale, tBrand), reason: pick.reason };
  });
  return { recommendations };
}
