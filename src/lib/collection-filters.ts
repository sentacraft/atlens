import { isZoom } from "@/lib/lens/lens";
import { pickNewEntry } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

// A collection membership predicate. Locale matters because some collections
// (e.g. price bands) read region-specific pricing.
export type LensFilter = (lens: Lens, locale: string) => boolean;

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
// more Chinese makers (AstrHori, …) get added to the dataset.
const CHINESE_BRANDS = ["viltrox", "7artisans", "ttartisan", "brightinstar", "sgimage", "laowa", "meike", "sirui"];

export const FILTERS = {
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
  "chinese-mf-095": (lens) => {
    if (!xPhoto(lens) || isZoom(lens) || lens.maxAperture == null) {
      return false;
    }
    const ap = Array.isArray(lens.maxAperture) ? lens.maxAperture[0] : lens.maxAperture;
    return CHINESE_BRANDS.includes(lens.brand) && ap <= 0.95;
  },
} satisfies Record<string, LensFilter>;

// Valid collection slugs, derived from FILTERS so the slug set lives in exactly
// one place. Anything in code that names a slug (the *_SLUGS lists in collections.ts) is
// typed against this, so a typo becomes a compile error.
export type CollectionSlug = keyof typeof FILTERS;
