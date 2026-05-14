import lensesData from "../data/lenses.json";
import gfxLensesData from "../data/lenses-gfx.json";
import metaData from "../data/meta.json";
import { lensCatalogSchema } from "./lens-schema";
import { resolveTranslations, type Lens, type LensCatalog, type Mount, type SpecialtyTag } from "./types";
export type { SpecialtyTag };

const xLenses: Lens[] = lensCatalogSchema.parse(lensesData) as LensCatalog;
const gfxLenses: Lens[] = lensCatalogSchema.parse(gfxLensesData) as LensCatalog;

export const meta = metaData;
export const brandCount = new Set(xLenses.map((l) => l.brand)).size;
export const MAX_COMPARE = 4;

export const CROP_FACTOR: Record<Mount, number> = {
  X: 1.5,
  G: 0.79, // GFX 44×33 mm diagonal ≈54.78 mm vs FF ≈43.3 mm
};

const resolvedCache = new Map<string, Lens[]>();

function getResolved(base: Lens[], locale: string): Lens[] {
  const key = `${base === xLenses ? "X" : "G"}:${locale}`;
  let result = resolvedCache.get(key);
  if (!result) {
    result = base.map((l) => resolveTranslations(l, locale));
    resolvedCache.set(key, result);
  }
  return result;
}

export function getLensesByMount(mount: Mount, locale: string): Lens[] {
  return getResolved(mount === "G" ? gfxLenses : xLenses, locale);
}

export function getAllLenses(locale: string): Lens[] {
  return [...getLensesByMount("X", locale), ...getLensesByMount("G", locale)];
}

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
  mount?: Mount;
}): FocalCategory[] {
  const cropFactor = CROP_FACTOR[lens.mount ?? "X"];
  const lensEquivMin = lens.focalLengthMin * cropFactor;
  const lensEquivMax = lens.focalLengthMax * cropFactor;

  return FOCAL_CATEGORIES.filter((cat) => {
    const catMin = "equivMinInclusive" in cat ? cat.equivMinInclusive : -Infinity;
    const catMax = "equivMaxExclusive" in cat ? cat.equivMaxExclusive : Infinity;
    // overlap: lens range intersects [catMin, catMax)
    return lensEquivMin < catMax && lensEquivMax >= catMin;
  }).map((cat) => cat.key);
}

export type FocusMotorClass = "linear" | "stepping" | "dc" | "other";

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
 * lens lands with one, add an "ultrasonic" class here and in MOTOR_CLASSES.
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

    if (filters.focusFilter === "auto" && !lens.af) {

      return false;

    }
    if (filters.focusFilter === "manual" && lens.af) {
      return false;
    }

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

export function parseLensIds(ids: string | undefined, mount: Mount, locale: string): Lens[] {
  const pool = getLensesByMount(mount, locale);
  return (ids ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, MAX_COMPARE)
    .map((id) => pool.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}

export type SortKey = "focalLength" | "maxAperture" | "weightG";

function getSortableMaxAperture(lens: Lens): number {
  // Fall back to T-stop wide end when f-stop is unpublished (cine lenses).
  // T-stop is numerically slightly larger than f-stop but ordering is preserved
  // for sort purposes within the cine cohort.
  const value = lens.maxAperture ?? lens.maxTStop;
  if (value === undefined) {
    return Number.POSITIVE_INFINITY;
  }
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

export function defaultMarketForLocale(locale: string): "cn" | "global" {
  return locale === "zh" ? "cn" : "global";
}

