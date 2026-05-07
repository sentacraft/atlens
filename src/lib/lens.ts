import lensesData from "../data/lenses.json";
import metaData from "../data/meta.json";
import { lensCatalogSchema } from "./lens-schema";
import type { Lens, LensCatalog, SpecialtyTag } from "./types";
export type { SpecialtyTag };

export const allLenses: Lens[] = lensCatalogSchema.parse(lensesData) as LensCatalog;
export const meta = metaData;
export const brandCount = new Set(allLenses.map((l) => l.brand)).size;
export const MAX_COMPARE = 4;

export type LensType = "prime" | "zoom";
export const LENS_TYPES = ["prime", "zoom"] as const satisfies readonly LensType[];

export function isZoom(lens: Lens): boolean {
  return lens.focalLengthMin !== lens.focalLengthMax;
}

// Boolean Lens fields that can be used as filter conditions.
// satisfies (keyof Lens)[] enforces at compile time that each key exists on Lens.
export const FILTER_FEATURE_KEYS = [
  "ois",
  "wr",
  "apertureRing",
  "powerZoom",
] as const satisfies readonly (keyof Lens)[];

export type FocusFilter = "auto" | "manual";

export type FilterFeatureKey = (typeof FILTER_FEATURE_KEYS)[number];

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
}): FocalCategory[] {
  const cropFactor = 1.5;
  const lensEquivMin = lens.focalLengthMin * cropFactor;
  const lensEquivMax = lens.focalLengthMax * cropFactor;

  return FOCAL_CATEGORIES.filter((cat) => {
    const catMin = "equivMinInclusive" in cat ? cat.equivMinInclusive : -Infinity;
    const catMax = "equivMaxExclusive" in cat ? cat.equivMaxExclusive : Infinity;
    // overlap: lens range intersects [catMin, catMax)
    return lensEquivMin < catMax && lensEquivMax >= catMin;
  }).map((cat) => cat.key);
}

export type FocusMotorClass = "linear" | "stepping" | "other";

/**
 * Classify a brand-specific focus motor string into a canonical class.
 * Returns undefined only for MF-only lenses (af === false).
 * AF lenses with an undocumented motor type return "other".
 */
export function classifyFocusMotor(lens: Lens): FocusMotorClass | undefined {
  if (!lens.af) return undefined;
  const m = lens.focusMotor;
  if (!m) return "other"; // AF but motor type not documented → treated as Other

  const s = m.toLowerCase();
  // Linear family: LM, HLA, VXD, VCM, Triple/Quad Linear, Dual HyperVCM
  if (/\b(lm|hla|vxd|vcm)\b/.test(s) || s.includes("linear") || s.includes("hypervcm"))
    return "linear";
  // Stepping family: STM, RXD, "Stepping Motor", "STM+Lead screw"
  if (/\b(stm|rxd)\b/.test(s) || s.includes("stepping"))
    return "stepping";
  return "other";
}

export interface FilterState {
  brands: string[]; // empty = all brands
  typeFilter: LensType | null; // null = all types
  focusFilter: FocusFilter | null; // null = all
  specialtyTag: SpecialtyTag | null; // null = no filter
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
  specialtyTag: null,
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

    if (filters.focusFilter === "auto" && !lens.af) return false;
    if (filters.focusFilter === "manual" && lens.af) return false;

    if (filters.specialtyTag && !lens.specialtyTags?.includes(filters.specialtyTag)) {
      return false;
    }

    if (filters.focusMotorClass && classifyFocusMotor(lens) !== filters.focusMotorClass) {
      return false;
    }

    for (const field of FILTER_FEATURE_KEYS) {
      if (filters.features.includes(field) && !lens[field]) {
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

export function getOrderedUniqueBrands(lenses: Lens[]): string[] {
  const present = new Set(lenses.map((l) => l.brand));
  const ordered = BRAND_DISPLAY_ORDER.filter((b) => present.has(b));
  const rest = [...present].filter((b) => !BRAND_DISPLAY_ORDER.includes(b)).sort();
  return [...ordered, ...rest];
}

// Returns the locale-appropriate official link with no fallback:
// zh → cn only, others → global only. Returns undefined if the locale's link is absent.
export function getLensUrl(lens: Lens, locale?: string): string | undefined {
  if (locale === "zh") {
    return lens.officialLinks?.cn;
  }
  return lens.officialLinks?.global;
}

export function parseLensIds(ids: string | undefined): Lens[] {
  return (ids ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, MAX_COMPARE)
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}

export type SortKey = "focalLength" | "maxAperture" | "weightG";

function getSortableMaxAperture(lens: Lens): number {
  // Fall back to T-stop wide end when f-stop is unpublished (cine lenses).
  // T-stop is numerically slightly larger than f-stop but ordering is preserved
  // for sort purposes within the cine cohort.
  const value = lens.maxAperture ?? lens.maxTStop;
  if (value === undefined) return Number.POSITIVE_INFINITY;
  return Array.isArray(value) ? value[0] : value;
}

export function sortLenses(
  lenses: Lens[],
  key: SortKey,
  dir: "asc" | "desc"
): Lens[] {
  return [...lenses].sort((a, b) => {
    if (key === "maxAperture") {
      const delta = getSortableMaxAperture(a) - getSortableMaxAperture(b);
      return dir === "asc" ? delta : -delta;
    }

    const field: keyof Lens =
      key === "focalLength"
        ? dir === "asc"
          ? "focalLengthMin"
          : "focalLengthMax"
        : key;
    const delta = (a[field] as number) - (b[field] as number);
    return dir === "asc" ? delta : -delta;
  });
}
