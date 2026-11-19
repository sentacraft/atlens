import { angleOfViewDisplay, focalEquiv, focalRangeDisplay, primaryApertureDisplay, weightDisplay } from "@/lib/lens/format";
import { isZoom } from "@/lib/lens/lens";
import { pickNewEntry } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

export const PROMO_WIDTH = 1080;
export const PROMO_HEIGHT = 1440;
const MAX_ROWS = 6;

type PromoSpec = "length" | "weight" | "aperture" | "angle" | "focal" | "referencePrice";

type PromoOrder = "thinOrder" | "lightOrder" | "apertureOrder" | "angleOrder" | "wideEndOrder" | "wideApertureOrder" | "priceOrder" | "weightOrder";

interface PromoListing {
  columns: readonly [PromoSpec, PromoSpec];
  order: PromoOrder;
  starts?: readonly number[];
  groupBy?: "collection" | "focus";
}

export interface PromoTheme extends PromoListing {
  zoom?: PromoListing;
}

export const PROMO_THEMES = {
  pancake: { columns: ["length", "weight"], order: "thinOrder", starts: [18, 23, 27] },
  "under-200g": {
    columns: ["weight", "aperture"], order: "lightOrder",
    zoom: { columns: ["weight", "focal"], order: "weightOrder", groupBy: "collection" },
  },
  "fast-aperture-primes": { columns: ["aperture", "weight"], order: "apertureOrder" },
  fisheye: { columns: ["angle", "weight"], order: "angleOrder" },
  "travel-zoom": { columns: ["focal", "weight"], order: "wideEndOrder", groupBy: "collection" },
  "23mm": { columns: ["aperture", "weight"], order: "wideApertureOrder", groupBy: "collection" },
  "under-200": { columns: ["referencePrice", "aperture"], order: "priceOrder", groupBy: "focus" },
} as const satisfies Record<string, PromoTheme>;

function firstValue(value: number | [number, number] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mainlandReference(lens: Lens) {
  const entry = pickNewEntry(lens.pricing?.cn?.new);
  return entry?.currency === "CNY" ? entry.price : undefined;
}

const specOrder: Record<PromoSpec, (lens: Lens) => number | undefined> = {
  focal: (lens) => lens.focalLengthMin,
  referencePrice: mainlandReference,
  length: (lens) => lens.length?.mm,
  weight: (lens) => Array.isArray(lens.weightG) ? lens.weightG[1] : lens.weightG,
  aperture: (lens) => firstValue(lens.maxAperture),
  angle: (lens) => {
    const angle = firstValue(lens.angleOfView);
    return angle === undefined ? undefined : -angle;
  },
};

export interface PromoLens {
  id: string;
  name: string;
  caption?: string;
  brand: string;
  focus: "AF" | "MF";
  focal: string;
  length: string;
  weight: string;
  aperture: string;
  angle: string;
  referencePrice?: string;
  image: string;
}

interface FocalGroup {
  actual: string;
  lenses: PromoLens[];
}

export interface PromoGroupPage {
  range: string;
  focus?: PromoLens["focus"];
  zoom?: true;
  groups: FocalGroup[];
}

export type PromoPage = { kind: "cover" | "end" } | ({ kind: "group" } & PromoGroupPage);

export interface PromoDeck {
  slug: string;
  title: string;
  subtitle: string;
  scope?: string;
  lensCount: number;
  brandCount: number;
  cover: PromoLens[];
  pages: PromoPage[];
  theme: PromoTheme;
  related: { slug: string; title: string; description: string; count: number }[];
  catalog: { brands: number; lenses: number; themes: number };
  comparison: PromoLens[];
}

export function buildPromoGroupPages(
  lenses: readonly Lens[],
  toRow: (lens: Lens) => PromoLens,
  theme: PromoTheme,
): PromoGroupPage[] {
  if (!theme.zoom) {return buildPages(lenses, toRow, theme);}
  return [
    ...buildPages(lenses.filter((lens) => !isZoom(lens)), toRow, theme),
    ...buildPages(lenses.filter(isZoom), toRow, theme.zoom).map((page) => ({ ...page, zoom: true as const })),
  ];
}

function buildPages(lenses: readonly Lens[], toRow: (lens: Lens) => PromoLens, listing: PromoListing): PromoGroupPage[] {
  const { starts = [], groupBy, columns: [primary] } = listing;
  const order = specOrder[primary];
  const sorted = [...lenses].sort((a, b) => {
    const byFocus = groupBy === "focus" ? Number(b.af) - Number(a.af) : 0;
    const bySpec = (order(a) ?? Infinity) - (order(b) ?? Infinity);
    const byFocal = a.focalLengthMin - b.focalLengthMin || a.focalLengthMax - b.focalLengthMax;
    return (groupBy ? byFocus || bySpec || byFocal : byFocal || bySpec) || a.id.localeCompare(b.id);
  });
  const pages: PromoGroupPage[] = [];
  let groups: FocalGroup[] = [];
  let count = 0;
  let low = 0;
  let high = 0;
  let band = 0;
  let focus: PromoLens["focus"] | undefined;
  function flush() {
    if (count) {pages.push({ range: focalRangeDisplay(low, high), focus, groups });}
    groups = [];
    count = 0;
  }
  for (const lens of sorted) {
    const nextBand = starts.filter((start) => lens.focalLengthMin >= start).length;
    const nextFocus = groupBy === "focus" ? (lens.af ? "AF" : "MF") : undefined;
    if (count === MAX_ROWS || nextBand !== band || nextFocus !== focus) {flush();}
    band = nextBand;
    focus = nextFocus;
    const min = focalEquiv(lens.focalLengthMin, lens.mount);
    const max = focalEquiv(lens.focalLengthMax, lens.mount);
    const actual = focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax);
    if (!count) { low = min; high = max; }
    low = Math.min(low, min);
    high = Math.max(high, max);
    const last = groups.at(-1);
    const row = toRow(lens);
    if (last?.actual === actual) {last.lenses.push(row);}
    else {groups.push({ actual, lenses: [row] });}
    count++;
  }
  flush();
  return pages;
}

const formatReferenceAmount = new Intl.NumberFormat("zh-CN");

export function promoLens(lens: Lens, brand: string, image: string): PromoLens {
  const reference = mainlandReference(lens);
  return {
    id: lens.id,
    name: lens.model,
    brand,
    focus: lens.af ? "AF" : "MF",
    focal: focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax).replace(/mm$/, ""),
    length: lens.length?.mm?.toString() ?? "—",
    weight: weightDisplay(lens.weightG, "") ?? "—",
    aperture: primaryApertureDisplay(lens) ?? "—",
    angle: angleOfViewDisplay(lens.angleOfView) ?? "—",
    referencePrice: reference === undefined ? undefined : `¥${formatReferenceAmount.format(reference)}`,
    image,
  };
}

export function promoPageNumber(page: number): string {
  return String(page).padStart(2, "0");
}

export function promoFileName(slug: string, page: number): string {
  return `${promoPageNumber(page)}-${slug}.png`;
}
