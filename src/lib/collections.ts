import collectionsData from "../data/collections.json";
import { isZoom, getLensesByMount } from "./lens";
import { pickNewEntry } from "./lens-pricing";
import type { Mount, Lens } from "./types";

type LensFilter = (lens: Lens, locale: string) => boolean;

export interface LensCollection {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  filter: LensFilter;
}

function xMount(lens: Lens): boolean {
  return lens.mount === "X";
}

function xPhoto(lens: Lens): boolean {
  return xMount(lens) && !lens.isCine;
}

// Specialty optics deliver a non-standard projection (fisheye) or workflow
// (macro, tilt/shift) and have their own dedicated collections. They are
// excluded from general-purpose framing collections so a fisheye never
// surfaces as an everyday "pancake" or a rectilinear wide-angle option.
const SPECIAL_OPTICS = ["fisheye", "macro", "tilt", "shift"];
function isSpecialOptic(lens: Lens): boolean {
  return lens.opticalTraits?.some((t) => SPECIAL_OPTICS.includes(t)) ?? false;
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

// Chinese lens brands grouped under their own category. Extend this list as
// more Chinese makers (AstrHori, Meike, …) get added to the dataset.
const CHINESE_BRANDS = ["viltrox", "7artisans", "ttartisan", "brightinstar", "sgimage", "laowa"];

const FILTERS: Record<string, LensFilter> = {
  // --- Prime ---
  "23mm": xPrime(22, 24),
  "35mm": xPrime(33, 36),
  "50mm": xPrime(48, 51),
  "56mm": xPrime(55, 58),
  "85mm": xPrime(83, 90),
  "wide-angle-primes": (lens) =>
    xPhoto(lens) && !isZoom(lens) && !isSpecialOptic(lens) && lens.focalLengthMin <= 18,

  // --- Zoom ---
  "wide-zoom": (lens) =>
    xPhoto(lens) && isZoom(lens) && !isSpecialOptic(lens) && lens.focalLengthMin <= 12,

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

  // --- Brand ---
  fujifilm: (lens) => xPhoto(lens) && lens.brand === "fujifilm",
  "7artisans": xBrand("7artisans"),
  viltrox: (lens) => xPhoto(lens) && lens.brand === "viltrox" && lens.af === true,
  ttartisan: xBrand("ttartisan"),
  sigma: xBrand("sigma"),
  brightinstar: xBrand("brightinstar"),
  voigtlander: xBrand("voigtlander"),
  laowa: xBrand("laowa"),
  tamron: xBrand("tamron"),
  sgimage: xBrand("sgimage"),

  // --- Series ---
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

  // --- Price ---
  "under-200": (lens, locale) => {
    if (locale === "zh") {
      const p = pickNewEntry(lens.pricing?.cn?.new)?.price;
      return xPhoto(lens) && p != null && p < 1000;
    }
    const p = pickNewEntry(lens.pricing?.global?.new)?.price;
    return xPhoto(lens) && p != null && p < 200;
  },

  "under-400": (lens, locale) => {
    if (locale === "zh") {
      const p = pickNewEntry(lens.pricing?.cn?.new)?.price;
      return xPhoto(lens) && p != null && p < 2000;
    }
    const p = pickNewEntry(lens.pricing?.global?.new)?.price;
    return xPhoto(lens) && p != null && p < 400;
  },

  // --- Portability ---
  "under-200g": (lens) => {
    if (!xPhoto(lens)) {
      return false;
    }
    const w = Array.isArray(lens.weightG) ? lens.weightG[1] : lens.weightG;
    return w != null && w < 200;
  },

  "pancake": (lens) =>
    xPhoto(lens) &&
    !isZoom(lens) &&
    !isSpecialOptic(lens) &&
    lens.length?.mm != null &&
    lens.length.mm <= 35,

  // --- Aperture ---
  "fast-aperture-primes": (lens) => {
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

  // --- Trait ---
  "weather-sealed": (lens) =>
    xPhoto(lens) && (lens.wr === true || lens.wr === "partial"),

  "with-ois": (lens) => xPhoto(lens) && lens.ois === true,

  // --- Dedicated ---
  cine: (lens) => xMount(lens) && lens.isCine === true,

  fisheye: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("fisheye"),

  "tilt-shift": (lens) =>
    xPhoto(lens) &&
    (!!lens.opticalTraits?.includes("tilt") || !!lens.opticalTraits?.includes("shift")),

  macro: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("macro"),

  // --- Chinese brands ---
  // A broad "all manual glass" bucket isn't a real shopping intent, so the
  // manual side is split into sharp character/value collections instead.
  // Specialty optics are excluded here — they live in the Dedicated section.
  "chinese-af": (lens) =>
    xPhoto(lens) &&
    !isZoom(lens) &&
    !isSpecialOptic(lens) &&
    CHINESE_BRANDS.includes(lens.brand) &&
    lens.af === true,
  "chinese-mf-fast": (lens) => {
    if (!xPhoto(lens) || isZoom(lens) || isSpecialOptic(lens) || lens.maxAperture == null) {
      return false;
    }
    const ap = Array.isArray(lens.maxAperture) ? lens.maxAperture[0] : lens.maxAperture;
    return CHINESE_BRANDS.includes(lens.brand) && lens.af === false && ap > 0.95 && ap <= 1.4;
  },
  "chinese-mf-budget": (lens, locale) => {
    if (
      !xPhoto(lens) ||
      isZoom(lens) ||
      isSpecialOptic(lens) ||
      lens.af !== false ||
      !CHINESE_BRANDS.includes(lens.brand)
    ) {
      return false;
    }
    if (locale === "zh") {
      const p = pickNewEntry(lens.pricing?.cn?.new)?.price;
      return p != null && p < 500;
    }
    const p = pickNewEntry(lens.pricing?.global?.new)?.price;
    return p != null && p < 100;
  },
  "chinese-095": (lens) => {
    if (!xPhoto(lens) || isZoom(lens) || lens.maxAperture == null) {
      return false;
    }
    const ap = Array.isArray(lens.maxAperture) ? lens.maxAperture[0] : lens.maxAperture;
    return CHINESE_BRANDS.includes(lens.brand) && ap <= 0.95;
  },
};

const parsed: LensCollection[] = collectionsData.collections.map((entry) => {
  const filter = FILTERS[entry.slug];
  if (!filter) {
    throw new Error(`No filter defined for collection "${entry.slug}"`);
  }
  return { slug: entry.slug, title: entry.title, description: entry.description, shortDescription: entry.shortDescription, filter };
});

export const COLLECTIONS: Record<string, LensCollection> = Object.fromEntries(
  parsed.map((c) => [c.slug, c]),
);

export const PRIME_SLUGS = ["23mm", "35mm", "50mm", "56mm", "85mm", "wide-angle-primes"];
export const ZOOM_SLUGS = ["wide-zoom", "standard-zoom", "travel-zoom", "tele-zoom"];
export const BRAND_SLUGS = ["fujifilm", "7artisans", "viltrox", "ttartisan", "sigma", "brightinstar", "voigtlander", "laowa", "tamron", "sgimage"];
export const SERIES_SLUGS = ["fujifilm-xf", "fujifilm-xc", "sigma-contemporary", "viltrox-air", "viltrox-pro", "voigtlander-nokton"];
export const PRICE_SLUGS = ["under-200", "under-400"];
export const PORTABILITY_SLUGS = ["under-200g", "pancake"];
export const APERTURE_SLUGS = ["fast-aperture-primes", "constant-aperture"];
export const TRAIT_SLUGS = ["weather-sealed", "with-ois", "super-tele"];
export const DEDICATED_SLUGS = ["cine", "fisheye", "tilt-shift", "macro"];
export const CHINESE_SLUGS = ["chinese-af", "chinese-mf-fast", "chinese-095", "chinese-mf-budget"];

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

export interface CollectionStats {
  collection: LensCollection;
  lenses: Lens[];
  lensCount: number;
  brandCount: number;
}

export function getCollectionStats(
  slug: string,
  mount: Mount,
  locale: string,
): CollectionStats | null {
  const collection = COLLECTIONS[slug];
  if (!collection) {
    return null;
  }
  const lenses = getLensesByMount(mount, locale).filter((l) =>
    collection.filter(l, locale),
  );
  return {
    collection,
    lenses,
    lensCount: lenses.length,
    brandCount: new Set(lenses.map((l) => l.brand)).size,
  };
}

export interface RelatedCollectionStats {
  collection: LensCollection;
  previewLens: Lens;
  lensCount: number;
  brandCount: number;
}

export function getRelatedCollectionsWithStats(
  slug: string,
  mount: Mount,
  locale: string,
  limit = 4,
): RelatedCollectionStats[] {
  const allLenses = getLensesByMount(mount, locale);
  const related = getRelatedCollections(slug, allLenses, locale, limit);
  return related.map((c) => {
    const ls = allLenses.filter((l) => c.filter(l, locale));
    return {
      collection: c,
      previewLens: ls[0],
      lensCount: ls.length,
      brandCount: new Set(ls.map((l) => l.brand)).size,
    };
  });
}

export interface MemberCollectionInfo {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  filter: LensFilter;
  lensCount: number;
}

export function getMemberCollections(
  lens: Lens,
  mount: Mount,
  locale: string,
): MemberCollectionInfo[] {
  const allLenses = getLensesByMount(mount, locale);
  return Object.values(COLLECTIONS)
    .filter((c) => c.filter(lens, locale))
    .map((c) => ({
      ...c,
      lensCount: allLenses.filter((l) => c.filter(l, locale)).length,
    }));
}

export function getSharedCollections(
  lenses: Lens[],
  mount: Mount,
  locale: string,
): MemberCollectionInfo[] {
  if (lenses.length === 0) {
    return [];
  }
  if (lenses.length === 1) {
    return getMemberCollections(lenses[0], mount, locale);
  }
  const allLenses = getLensesByMount(mount, locale);
  return Object.values(COLLECTIONS)
    .filter((c) => lenses.every((lens) => c.filter(lens, locale)))
    .map((c) => ({
      ...c,
      lensCount: allLenses.filter((l) => c.filter(l, locale)).length,
    }));
}
