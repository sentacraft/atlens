import { isZoom } from "@/lib/lens/lens";
import { pickNewEntry } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

export type LensFilter = (lens: Lens, locale: string) => boolean;

function xMount(lens: Lens): boolean {
  return lens.mount === "X";
}

function xPhoto(lens: Lens): boolean {
  return xMount(lens) && !lens.isCine;
}

// Excluded from general-purpose collections so a fisheye never shows up as an everyday wide-angle.
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

const CHINESE_BRANDS = ["viltrox", "7artisans", "ttartisan", "brightinstar", "sgimage", "laowa", "meike", "sirui"];

export const FILTERS = {
  "23mm": xPrime(22, 24),
  "35mm": xPrime(33, 36),
  "50mm": xPrime(48, 51),
  "56mm": xPrime(55, 58),
  "85mm": xPrime(83, 90),
  "wide-angle-primes": (lens) =>
    xPhoto(lens) && !isZoom(lens) && !isSpecialOptic(lens) && lens.focalLengthMin <= 18,

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

  "internal-zoom": (lens) =>
    xPhoto(lens) && isZoom(lens) && !isSpecialOptic(lens) && lens.internalZoom === true,

  "super-tele": (lens) =>
    xPhoto(lens) &&
    (isZoom(lens) ? lens.focalLengthMax >= 300 : lens.focalLengthMin >= 200),

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
  "sirui-sniper": (lens) =>
    xPhoto(lens) && lens.brand === "sirui" && lens.series === "Sniper",

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

  "weather-sealed": (lens) =>
    xPhoto(lens) && (lens.wr === true || lens.wr === "partial"),

  "with-ois": (lens) => xPhoto(lens) && lens.ois === true,

  cine: (lens) => xMount(lens) && lens.isCine === true,

  fisheye: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("fisheye"),

  "tilt-shift": (lens) =>
    xPhoto(lens) &&
    (!!lens.opticalTraits?.includes("tilt") || !!lens.opticalTraits?.includes("shift")),

  macro: (lens) =>
    xPhoto(lens) && !!lens.opticalTraits?.includes("macro"),

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

export type CollectionSlug = keyof typeof FILTERS;
