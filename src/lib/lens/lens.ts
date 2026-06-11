import { OPTICAL_TRAITS, type Lens, type Mount, type OpticalTrait } from "@/lib/types";
import { deriveSpecialty } from "@/lib/lens/specialty";

export const MAX_COMPARE = 4;

export const CROP_FACTOR: Record<Mount, number> = {
  X: 1.5,
  G: 0.79, // GFX 44×33 mm diagonal ≈54.78 mm vs FF ≈43.3 mm
};

export const LENS_TYPES = ["prime", "zoom"] as const;
export type LensType = (typeof LENS_TYPES)[number];

export function isZoom(lens: Lens): boolean {
  return lens.focalLengthMin !== lens.focalLengthMax;
}

// Lens fields that can be used as filter conditions.
// satisfies (keyof Lens)[] enforces at compile time that each key exists on Lens.
// Most are plain booleans; wr and internalZoom carry richer semantics resolved
// by lensHasFeature below.
export const FILTER_FEATURE_KEYS = [
  "ois",
  "wr",
  "apertureRing",
  "powerZoom",
  "internalZoom",
] as const satisfies readonly (keyof Lens)[];

export const FOCUS_FILTERS = ["auto", "manual"] as const;
export type FocusFilter = (typeof FOCUS_FILTERS)[number];

export type FilterFeatureKey = (typeof FILTER_FEATURE_KEYS)[number];

/**
 * Whether a lens satisfies a feature toggle. Semantics are spelled out here
 * rather than riding on truthiness:
 * - wr: "partial" weather sealing still counts as having WR.
 * - powerZoom / internalZoom: zoom-only tri-state (true | false | "N/A"); only
 *   `true` counts, so "N/A" (primes) and false (manual / extending zooms) are
 *   excluded — handled by the `=== true` default below.
 *
 * Note: powerZoom and internalZoom are not orthogonal to the prime/zoom type
 * facet (only zooms can have them); selecting either alongside type=prime
 * yields an empty set, which is the intended, consistent behavior.
 */
export function lensHasFeature(lens: Lens, key: FilterFeatureKey): boolean {
  if (key === "wr") {
    return lens.wr === true || lens.wr === "partial";
  }
  return lens[key] === true;
}

/**
 * Focal-length categories based on full-frame equivalent focal length.
 * A lens matches a category if its [focalLengthMin, focalLengthMax] range
 * overlaps with the category's equivalent range.
 *
 * Boundaries are defined in FF-equivalent mm and divided by 1.5 at runtime
 * to produce the raw X-mount crop-sensor boundaries used for filtering.
 */
export const FOCAL_CATEGORIES = [
  {
    key: "ultrawide",
    /** FF equiv max: <24mm */
    equivMaxExclusive: 24,
  },
  {
    key: "wide",
    equivMinInclusive: 24,
    equivMaxExclusive: 35,
  },
  {
    key: "standard",
    equivMinInclusive: 35,
    equivMaxExclusive: 70,
  },
  {
    key: "mediumTele",
    equivMinInclusive: 70,
    equivMaxExclusive: 150,
  },
  {
    key: "superTele",
    /** FF equiv min: >=150mm */
    equivMinInclusive: 150,
  },
] as const;

export type FocalCategory = (typeof FOCAL_CATEGORIES)[number]["key"];

/**
 * Returns the FocalCategory keys that a lens overlaps.
 * A lens matches a category when [focalLengthMin * 1.5, focalLengthMax * 1.5]
 * has any overlap with the category's full-frame equivalent range.
 */
export function getFocalCategoriesOf(lens: {
  focalLengthMin: number;
  focalLengthMax: number;
  mount: Mount;
}): FocalCategory[] {
  const cropFactor = CROP_FACTOR[lens.mount];
  const lensEquivMin = lens.focalLengthMin * cropFactor;
  const lensEquivMax = lens.focalLengthMax * cropFactor;

  return FOCAL_CATEGORIES.filter((cat) => {
    const catMin = "equivMinInclusive" in cat ? cat.equivMinInclusive : -Infinity;
    const catMax = "equivMaxExclusive" in cat ? cat.equivMaxExclusive : Infinity;
    // overlap: lens range intersects [catMin, catMax)
    return lensEquivMin < catMax && lensEquivMax >= catMin;
  }).map((cat) => cat.key);
}

export const FOCUS_MOTOR_CLASSES = ["linear", "stepping", "dc", "other"] as const;
export type FocusMotorClass = (typeof FOCUS_MOTOR_CLASSES)[number];

/**
 * Classify a brand-specific focus motor string into a canonical class.
 *
 * Returns:
 * - undefined for MF-only lenses (af === false), or AF lenses with no
 *   documented motor type (focusMotor field absent). The two cases are
 *   distinguishable upstream by checking lens.af; this function collapses
 *   both into "no class to filter on".
 * - "linear" | "stepping" | "dc" | "other" for AF lenses with a documented
 *   motor type.
 *
 * Scope assumption: the four classes cover every motor seen on X-mount and
 * G-mount today. Ultrasonic motors (USM / SWM / SSM / HSM / SDM) are a
 * fifth global category but absent from this project's data; if a future
 * lens lands with one, add an "ultrasonic" class to FOCUS_MOTOR_CLASSES (and
 * classify it in this function).
 */
export function classifyFocusMotor(lens: Lens): FocusMotorClass | undefined {
  if (!lens.af) {
    return undefined;
  }
  const m = lens.focusMotor;
  if (!m) {
    return undefined;
  }

  const s = m.toLowerCase();
  // Linear family: LM, HLA, VXD, VCM, Triple/Quad Linear Motor, Dual HyperVCM
  if (/\b(lm|hla|vxd|vcm)\b/.test(s) || s.includes("linear") || s.includes("hypervcm")) {
    return "linear";
  }
  // Stepping family: STM, RXD, "Stepping Motor", "Stepper Motor", "STM+Lead screw"
  if (/\b(stm|rxd)\b/.test(s) || s.includes("stepping") || s.includes("stepper")) {
    return "stepping";
  }
  // DC family: "DC Motor" (any casing), "DC Coreless Motor", and Fujifilm's
  // legacy "High-Precision Motor" marketing label (high-precision DC motor).
  if (/\bdc\b/.test(s) || s.includes("high-precision motor") || s.includes("high precision motor")) {
    return "dc";
  }
  return "other";
}

/**
 * Top-level usage category — a view partition, not an additive refinement.
 * Photo and cine are two largely-separate product universes: most photo
 * shoppers don't want cine lenses cluttering their list, and a cine shopper
 * wants exclusive cine results. Always one of the two; defaults to "photo".
 */
export const USAGE_VALUES = ["photo", "cine"] as const;
export type UsageFilter = (typeof USAGE_VALUES)[number];

export interface FilterState {
  brands: string[]; // empty = all brands
  typeFilter: LensType | null; // null = all types
  focusFilter: FocusFilter | null; // null = all
  usage: UsageFilter;
  opticalTrait: OpticalTrait | null; // null = no filter
  focusMotorClass: FocusMotorClass | null; // null = no filter
  features: FilterFeatureKey[]; // empty = no requirement
  focalCategories: FocalCategory[]; // empty = all categories
  sort: SortKey;
  sortDir: "asc" | "desc";
}

export const defaultFilters: FilterState = {
  brands: [],
  typeFilter: null,
  focusFilter: null,
  usage: "photo",
  opticalTrait: null,
  focusMotorClass: null,
  features: [],
  focalCategories: [],
  sort: "focalLength",
  sortDir: "asc",
};

export function filterLenses(lenses: Lens[], filters: FilterState): Lens[] {
  return lenses.filter((lens) => {
    if (filters.brands.length > 0 && !filters.brands.includes(lens.brand)) {
      return false;
    }

    if (filters.typeFilter && filters.typeFilter !== (isZoom(lens) ? "zoom" : "prime")) {
      return false;
    }

    if (filters.focusFilter === "auto" && !lens.af) {

      return false;

    }
    if (filters.focusFilter === "manual" && lens.af) {
      return false;
    }

    const { isCine, opticalTraits } = deriveSpecialty(lens);
    if (filters.usage === "photo" && isCine) {
      return false;
    }
    if (filters.usage === "cine" && !isCine) {
      return false;
    }
    if (filters.opticalTrait !== null && !opticalTraits.includes(filters.opticalTrait)) {
      return false;
    }

    if (filters.focusMotorClass && classifyFocusMotor(lens) !== filters.focusMotorClass) {

      return false;

    }

    for (const field of FILTER_FEATURE_KEYS) {
      if (filters.features.includes(field) && !lensHasFeature(lens, field)) {
        return false;
      }
    }
    if (filters.focalCategories.length > 0) {
      const matchedCats = getFocalCategoriesOf(lens);
      const hasOverlap = filters.focalCategories.some((cat) =>
        matchedCats.includes(cat)
      );
      if (!hasOverlap) {
        return false;
      }
    }
    return true;
  });
}

// Fujifilm first, then major Japanese brands, then Chinese brands by pinyin initial.
export const BRAND_DISPLAY_ORDER: string[] = [
  "fujifilm",
  "tamron",
  "sigma",
  "ttartisan",
  "7artisans",
  "sgimage",
  "viltrox",
  "brightinstar",
];

export function getUniqueBrands(lenses: Lens[]): string[] {
  return [...new Set(lenses.map((l) => l.brand))].sort();
}

export function getAvailableOpticalTraits(lenses: { isCine?: boolean; opticalTraits?: OpticalTrait[] }[]): OpticalTrait[] {
  const present = new Set(
    lenses.flatMap((l) => deriveSpecialty(l).opticalTraits),
  );
  return OPTICAL_TRAITS.filter((trait) => present.has(trait));
}

// Partition lenses by the photo/cine view. This is the scope axis the brand
// and optical-trait controls narrow to, so switching the usage view surfaces
// only the brands/traits that actually exist in that universe.
export function selectByUsage(lenses: Lens[], usage: UsageFilter): Lens[] {
  return lenses.filter((lens) => {
    const { isCine } = deriveSpecialty(lens);
    return usage === "cine" ? isCine : !isCine;
  });
}

export function getOrderedUniqueBrands(lenses: Lens[]): string[] {
  const present = new Set(lenses.map((l) => l.brand));
  const ordered = BRAND_DISPLAY_ORDER.filter((b) => present.has(b));
  const rest = [...present].filter((b) => !BRAND_DISPLAY_ORDER.includes(b)).sort();
  return [...ordered, ...rest];
}

export interface AvailableFilterOptions {
  brands: string[];
  opticalTraits: OpticalTrait[];
  features: FilterFeatureKey[];
  focusMotorClasses: FocusMotorClass[];
  focalCategories: FocalCategory[];
  types: LensType[];
  focusModes: FocusFilter[];
}

// Which control values actually occur in a given lens set, in display order.
// Every browse filter narrows to these so a scope (e.g. the cine view) never
// shows a control whose every value yields zero results — cine lenses carry no
// AF motor and none of the photo feature flags, so those whole rows drop out
// rather than sitting there dead.
export function getAvailableFilterOptions(lenses: Lens[]): AvailableFilterOptions {
  const features = new Set<FilterFeatureKey>();
  const motors = new Set<FocusMotorClass>();
  const focals = new Set<FocalCategory>();
  const types = new Set<LensType>();
  const focusModes = new Set<FocusFilter>();

  for (const lens of lenses) {
    for (const field of FILTER_FEATURE_KEYS) {
      if (lensHasFeature(lens, field)) {
        features.add(field);
      }
    }
    const motor = classifyFocusMotor(lens);
    if (motor) {
      motors.add(motor);
    }
    for (const cat of getFocalCategoriesOf(lens)) {
      focals.add(cat);
    }
    types.add(isZoom(lens) ? "zoom" : "prime");
    focusModes.add(lens.af ? "auto" : "manual");
  }

  return {
    brands: getOrderedUniqueBrands(lenses),
    opticalTraits: getAvailableOpticalTraits(lenses),
    features: FILTER_FEATURE_KEYS.filter((f) => features.has(f)),
    focusMotorClasses: FOCUS_MOTOR_CLASSES.filter((m) => motors.has(m)),
    focalCategories: FOCAL_CATEGORIES.map((c) => c.key).filter((k) => focals.has(k)),
    types: LENS_TYPES.filter((t) => types.has(t)),
    focusModes: FOCUS_FILTERS.filter((m) => focusModes.has(m)),
  };
}

// Returns the locale-appropriate official link with no fallback:
// zh → cn only, others → global only. Returns undefined if the locale's link is absent.
export function getLensUrl(lens: Lens, locale?: string): string | undefined {
  if (locale === "zh") {
    return lens.officialLinks?.cn;
  }
  return lens.officialLinks?.global;
}

export const SORT_KEYS = ["focalLength", "maxAperture", "weightG", "length"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function sortLenses(
  lenses: Lens[],
  key: SortKey,
  dir: "asc" | "desc"
): Lens[] {
  const toComparable: Record<SortKey, (lens: Lens) => number> = {
    focalLength: (lens) => (dir === "asc" ? lens.focalLengthMin : lens.focalLengthMax),
    // Cine lenses publish only T-stop (no f-stop); fall back to it so they
    // still rank against each other in the cine / unfiltered views.
    maxAperture: (lens) => leadingValue(lens.maxAperture ?? lens.maxTStop) ?? Number.POSITIVE_INFINITY,
    weightG: (lens) => leadingValue(lens.weightG) ?? Number.POSITIVE_INFINITY,
    length: (lens) => lens.length?.mm ?? Number.POSITIVE_INFINITY,
  };

  return [...lenses].sort((a, b) => {
    const delta = toComparable[key](a) - toComparable[key](b);
    return dir === "asc" ? delta : -delta;
  });
}

export function defaultMarketForLocale(locale: string): "cn" | "global" {
  return locale === "zh" ? "cn" : "global";
}

/**
 * Leading end of a scalar-or-range spec: the bare number, or the low end of
 * a [low, high] tuple. Undefined passes through so each caller decides how to
 * rank missing data (e.g. sort pushes it to the end with `?? Infinity`, while
 * the compare table keeps it undefined to skip highlighting).
 */
export function leadingValue(value: number | [number, number] | undefined): number | undefined {
  return Array.isArray(value) ? value[0] : value;
}

