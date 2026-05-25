import collectionsData from "../data/collections.json";
import { isZoom } from "./lens";
import type { Lens } from "./types";

export interface LensCollection {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  filter: (lens: Lens) => boolean;
}

function xPrime(focalMin: number, focalMax: number): (lens: Lens) => boolean {
  return (lens) =>
    lens.mount === "X" &&
    !isZoom(lens) &&
    lens.focalLengthMin >= focalMin &&
    lens.focalLengthMin <= focalMax;
}

function xBrand(brand: string): (lens: Lens) => boolean {
  return (lens) => lens.mount === "X" && lens.brand === brand;
}

const FILTERS: Record<string, (lens: Lens) => boolean> = {
  "23mm": xPrime(22, 24),
  "35mm": xPrime(33, 36),
  "50mm": xPrime(48, 51),
  "56mm": xPrime(55, 58),
  "85mm": xPrime(83, 90),

  "7artisans": xBrand("7artisans"),
  viltrox: xBrand("viltrox"),
  ttartisan: xBrand("ttartisan"),
  sigma: xBrand("sigma"),

  "weather-sealed": (lens) =>
    lens.mount === "X" && (lens.wr === true || lens.wr === "partial"),

  macro: (lens) =>
    lens.mount === "X" && !!lens.opticalTraits?.includes("macro"),

  "under-200g": (lens) => {
    if (lens.mount !== "X") {
      return false;
    }
    const w = Array.isArray(lens.weightG) ? lens.weightG[1] : lens.weightG;
    return w != null && w < 200;
  },

  "with-ois": (lens) => lens.mount === "X" && lens.ois === true,
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

const FOCAL_SLUGS = ["23mm", "35mm", "50mm", "56mm", "85mm"];
const BRAND_SLUGS = ["7artisans", "viltrox", "ttartisan", "sigma"];
const FEATURE_SLUGS = ["weather-sealed", "macro", "under-200g", "with-ois"];

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

export function getRelatedCollections(slug: string): LensCollection[] {
  return categoryOf(slug)
    .filter((s) => s !== slug)
    .map((s) => COLLECTIONS[s])
    .filter(Boolean);
}
