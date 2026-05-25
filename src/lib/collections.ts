import collectionsData from "../data/collections.json";
import { isZoom } from "./lens";
import type { Lens } from "./types";

type LensFilter = (lens: Lens, locale: string) => boolean;

export interface LensCollection {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  filter: LensFilter;
}

function xPhoto(lens: Lens): boolean {
  return lens.mount === "X" && !lens.isCine;
}

function xPrime(focalMin: number, focalMax: number): LensFilter {
  return (lens) =>
    xPhoto(lens) &&
    !isZoom(lens) &&
    lens.focalLengthMin >= focalMin &&
    lens.focalLengthMin <= focalMax;
}

function xBrand(brand: string): LensFilter {
  return (lens) => xPhoto(lens) && lens.brand === brand;
}

const FILTERS: Record<string, LensFilter> = {
  "23mm": xPrime(22, 24),
  "35mm": xPrime(33, 36),
  "50mm": xPrime(48, 51),
  "56mm": xPrime(55, 58),
  "85mm": xPrime(83, 90),

  "7artisans": xBrand("7artisans"),
  viltrox: (lens) => xPhoto(lens) && lens.brand === "viltrox" && lens.af === true,
  ttartisan: xBrand("ttartisan"),
  sigma: xBrand("sigma"),

  "weather-sealed": (lens) =>
    xPhoto(lens) && (lens.wr === true || lens.wr === "partial"),

  macro: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("macro"),

  "under-200g": (lens) => {
    if (!xPhoto(lens)) {
      return false;
    }
    const w = Array.isArray(lens.weightG) ? lens.weightG[1] : lens.weightG;
    return w != null && w < 200;
  },

  "with-ois": (lens) => xPhoto(lens) && lens.ois === true,

  "fast-aperture": (lens) => {
    if (!xPhoto(lens) || isZoom(lens) || lens.maxAperture == null) {
      return false;
    }
    const ap = Array.isArray(lens.maxAperture) ? lens.maxAperture[0] : lens.maxAperture;
    return ap <= 1.4;
  },

  "compact-primes": (lens) =>
    xPhoto(lens) &&
    !isZoom(lens) &&
    lens.length?.mm != null &&
    lens.length.mm <= 40,

  "under-200": (lens, locale) => {
    if (locale === "zh") {
      const p = lens.pricing?.cn?.new?.price;
      return xPhoto(lens) && p != null && p < 1000;
    }
    const p = lens.pricing?.global?.new?.price;
    return xPhoto(lens) && p != null && p < 200;
  },

  "under-400": (lens, locale) => {
    if (locale === "zh") {
      const p = lens.pricing?.cn?.new?.price;
      return xPhoto(lens) && p != null && p < 2000;
    }
    const p = lens.pricing?.global?.new?.price;
    return xPhoto(lens) && p != null && p < 400;
  },

  cine: (lens) => lens.mount === "X" && lens.isCine === true,

  fisheye: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("fisheye"),

  "tilt-shift": (lens) =>
    xPhoto(lens) &&
    (!!lens.opticalTraits?.includes("tilt") || !!lens.opticalTraits?.includes("shift")),
};

const parsed: LensCollection[] = collectionsData.collections.map((entry) => {
  const filter = FILTERS[entry.slug];
  if (!filter) {
    throw new Error(`No filter defined for collection "${entry.slug}"`);
  }
  return { slug: entry.slug, title: entry.title, description: entry.description, filter };
});

export const COLLECTIONS: Record<string, LensCollection> = Object.fromEntries(
  parsed.map((c) => [c.slug, c]),
);

export const FOCAL_SLUGS = ["23mm", "35mm", "50mm", "56mm", "85mm"];
export const BRAND_SLUGS = ["7artisans", "viltrox", "ttartisan", "sigma"];
export const FEATURE_SLUGS = ["weather-sealed", "macro", "under-200g", "with-ois", "fast-aperture", "compact-primes", "under-200", "under-400", "cine", "fisheye", "tilt-shift"];

function categoryOf(slug: string): string[] {
  if (FOCAL_SLUGS.includes(slug)) {
    return FOCAL_SLUGS;
  }
  if (BRAND_SLUGS.includes(slug)) {
    return BRAND_SLUGS;
  }
  if (FEATURE_SLUGS.includes(slug)) {
    return FEATURE_SLUGS;
  }
  return [];
}

export function getCategoryKey(slug: string): "focal" | "brand" | "feature" | null {
  if (FOCAL_SLUGS.includes(slug)) {
    return "focal";
  }
  if (BRAND_SLUGS.includes(slug)) {
    return "brand";
  }
  if (FEATURE_SLUGS.includes(slug)) {
    return "feature";
  }
  return null;
}

export function getRelatedCollections(slug: string): LensCollection[] {
  return categoryOf(slug)
    .filter((s) => s !== slug)
    .map((s) => COLLECTIONS[s])
    .filter(Boolean);
}
