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

// wr: "partial" counts. powerZoom / internalZoom: only `true` counts, so primes ("N/A") never match.
export function lensHasFeature(lens: Lens, key: FilterFeatureKey): boolean {
  if (key === "wr") {
    return lens.wr === true || lens.wr === "partial";
  }
  return lens[key] === true;
}

// Boundaries are FF-equivalent mm.
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
    return lensEquivMin < catMax && lensEquivMax >= catMin;
  }).map((cat) => cat.key);
}

export const FOCUS_MOTOR_CLASSES = ["linear", "stepping", "dc", "other"] as const;
export type FocusMotorClass = (typeof FOCUS_MOTOR_CLASSES)[number];

// Undefined for MF lenses and for AF lenses with no documented motor. No ultrasonic class:
// no lens in the data has one yet.
export function classifyFocusMotor(lens: Lens): FocusMotorClass | undefined {
  if (!lens.af) {
    return undefined;
  }
  const m = lens.focusMotor;
  if (!m) {
    return undefined;
  }

  const s = m.toLowerCase();
  // LM, HLA, VXD, VCM, Linear Motor variants, HyperVCM
  if (/\b(lm|hla|vxd|vcm)\b/.test(s) || s.includes("linear") || s.includes("hypervcm")) {
    return "linear";
  }
  // STM, RXD, Stepping/Stepper Motor
  if (/\b(stm|rxd)\b/.test(s) || s.includes("stepping") || s.includes("stepper")) {
    return "stepping";
  }
  // Includes Fujifilm's legacy "High-Precision Motor" label.
  if (/\bdc\b/.test(s) || s.includes("high-precision motor") || s.includes("high precision motor")) {
    return "dc";
  }
  return "other";
}

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

// A control whose every value yields zero results in the current scope is hidden.
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

// No fallback to the other locale's link.
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
    // Cine lenses publish only T-stops.
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

export function leadingValue(value: number | [number, number] | undefined): number | undefined {
  return Array.isArray(value) ? value[0] : value;
}

