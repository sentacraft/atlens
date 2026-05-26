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

function xMount(lens: Lens): boolean {
  return lens.mount === "X";
}

function xPhoto(lens: Lens): boolean {
  return xMount(lens) && !lens.isCine;
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

const DOMESTIC_BRANDS = ["viltrox", "7artisans", "ttartisan", "brightinstar", "sgimage"];

const FILTERS: Record<string, LensFilter> = {
  // --- Prime (定焦) ---
  "23mm": xPrime(22, 24),
  "35mm": xPrime(33, 36),
  "50mm": xPrime(48, 51),
  "56mm": xPrime(55, 58),
  "85mm": xPrime(83, 90),
  "wide-angle": (lens) =>
    xPhoto(lens) && !isZoom(lens) && lens.focalLengthMin <= 18,

  // --- Zoom (变焦) ---
  "wide-zoom": (lens) =>
    xPhoto(lens) && isZoom(lens) && lens.focalLengthMin <= 12,

  "standard-zoom": (lens) =>
    xPhoto(lens) &&
    isZoom(lens) &&
    lens.focalLengthMin >= 13 &&
    lens.focalLengthMin <= 20 &&
    lens.focalLengthMax >= 40 &&
    lens.focalLengthMax <= 60,

  "travel-zoom": (lens) =>
    xPhoto(lens) &&
    isZoom(lens) &&
    lens.focalLengthMin <= 20 &&
    (lens.focalLengthMax / lens.focalLengthMin >= 4 || lens.focalLengthMax >= 120),

  "tele-zoom": (lens) =>
    xPhoto(lens) && isZoom(lens) && lens.focalLengthMin >= 50,

  "super-tele": (lens) =>
    xPhoto(lens) &&
    (isZoom(lens) ? lens.focalLengthMax >= 300 : lens.focalLengthMin >= 200),

  // --- Brand (品牌) ---
  fujifilm: (lens) => xPhoto(lens) && lens.brand === "fujifilm",
  "7artisans": xBrand("7artisans"),
  viltrox: (lens) => xPhoto(lens) && lens.brand === "viltrox" && lens.af === true,
  ttartisan: xBrand("ttartisan"),
  sigma: xBrand("sigma"),
  brightinstar: xBrand("brightinstar"),
  voigtlander: xBrand("voigtlander"),
  laowa: xBrand("laowa"),
  tamron: xBrand("tamron"),

  // --- Series (系列) ---
  "fujifilm-xf": (lens) =>
    xPhoto(lens) && lens.brand === "fujifilm" && lens.series === "XF",
  "fujifilm-xc": (lens) =>
    xPhoto(lens) && lens.brand === "fujifilm" && lens.series === "XC",
  "sigma-contemporary": (lens) =>
    xPhoto(lens) && lens.brand === "sigma" && lens.series === "Contemporary",
  "viltrox-air": (lens) =>
    xPhoto(lens) && lens.brand === "viltrox" && lens.series === "Air",
  "viltrox-pro": (lens) =>
    xPhoto(lens) && lens.brand === "viltrox" && lens.series === "Pro",
  "voigtlander-nokton": (lens) =>
    xPhoto(lens) && lens.brand === "voigtlander" && lens.series === "Nokton",

  // --- Price (价格) ---
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

  // --- Portability (便携) ---
  "under-200g": (lens) => {
    if (!xPhoto(lens)) {
      return false;
    }
    const w = Array.isArray(lens.weightG) ? lens.weightG[1] : lens.weightG;
    return w != null && w < 200;
  },

  "compact-primes": (lens) =>
    xPhoto(lens) &&
    !isZoom(lens) &&
    lens.length?.mm != null &&
    lens.length.mm <= 40,

  // --- Aperture (光圈) ---
  "fast-aperture": (lens) => {
    if (!xPhoto(lens) || isZoom(lens) || lens.maxAperture == null) {
      return false;
    }
    const ap = Array.isArray(lens.maxAperture) ? lens.maxAperture[0] : lens.maxAperture;
    return ap <= 1.4;
  },

  "constant-aperture": (lens) =>
    xPhoto(lens) &&
    isZoom(lens) &&
    lens.maxAperture != null &&
    !Array.isArray(lens.maxAperture),

  // --- Trait (特性) ---
  "weather-sealed": (lens) =>
    xPhoto(lens) && (lens.wr === true || lens.wr === "partial"),

  "with-ois": (lens) => xPhoto(lens) && lens.ois === true,

  // --- Dedicated (专用镜头) ---
  cine: (lens) => xMount(lens) && lens.isCine === true,

  fisheye: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("fisheye"),

  "tilt-shift": (lens) =>
    xPhoto(lens) &&
    (!!lens.opticalTraits?.includes("tilt") || !!lens.opticalTraits?.includes("shift")),

  macro: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("macro"),

  // --- Focus (对焦方式) ---
  autofocus: (lens) => xPhoto(lens) && lens.af === true,
  "manual-focus": (lens) => xPhoto(lens) && lens.af === false,
  "value-af": (lens) =>
    xPhoto(lens) && DOMESTIC_BRANDS.includes(lens.brand) && lens.af === true,
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

export const PRIME_SLUGS = ["23mm", "35mm", "50mm", "56mm", "85mm", "wide-angle"];
export const ZOOM_SLUGS = ["wide-zoom", "standard-zoom", "travel-zoom", "tele-zoom", "super-tele"];
export const BRAND_SLUGS = ["fujifilm", "7artisans", "viltrox", "ttartisan", "sigma", "brightinstar", "voigtlander", "laowa", "tamron"];
export const SERIES_SLUGS = ["fujifilm-xf", "fujifilm-xc", "sigma-contemporary", "viltrox-air", "viltrox-pro", "voigtlander-nokton"];
export const PRICE_SLUGS = ["under-200", "under-400"];
export const PORTABILITY_SLUGS = ["under-200g", "compact-primes"];
export const APERTURE_SLUGS = ["fast-aperture", "constant-aperture"];
export const TRAIT_SLUGS = ["weather-sealed", "with-ois"];
export const DEDICATED_SLUGS = ["cine", "fisheye", "tilt-shift", "macro"];
export const FOCUS_SLUGS = ["autofocus", "manual-focus", "value-af"];

export function getRelatedCollections(
  slug: string,
  allLenses: Lens[],
  locale: string,
  limit = 4,
): LensCollection[] {
  const current = COLLECTIONS[slug];
  if (!current) {
    return [];
  }
  const currentSet = new Set(
    allLenses.filter((l) => current.filter(l, locale)).map((l) => l.id),
  );
  if (currentSet.size === 0) {
    return [];
  }

  const others = Object.values(COLLECTIONS).filter((c) => c.slug !== slug);
  const scored = others.map((c) => {
    let overlap = 0;
    for (const l of allLenses) {
      if (currentSet.has(l.id) && c.filter(l, locale)) {
        overlap++;
      }
    }
    return { collection: c, overlap };
  });

  scored.sort((a, b) => b.overlap - a.overlap);
  return scored
    .filter((s) => s.overlap > 0)
    .slice(0, limit)
    .map((s) => s.collection);
}
