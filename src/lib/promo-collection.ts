import { focalEquiv, focalRangeDisplay, weightDisplay } from "@/lib/lens/format";
import { pickNewEntry } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

export const PROMO_WIDTH = 1080;
export const PROMO_HEIGHT = 1440;
const MAX_ROWS = 6;

export interface PromoLens {
  id: string;
  name: string;
  caption?: string;
  brand: string;
  focus: "AF" | "MF";
  length: string;
  weight: string;
  referencePrice?: string;
  image: string;
}

interface FocalGroup {
  actual: string;
  lenses: PromoLens[];
}

export interface PromoGroupPage {
  range: string;
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
  related: { slug: string; title: string; description: string; count: number }[];
  catalog: { brands: number; lenses: number; themes: number };
  comparison: PromoLens[];
}

export function buildPromoGroupPages(
  lenses: readonly Lens[],
  toRow: (lens: Lens) => PromoLens,
  starts: readonly number[] = [],
): PromoGroupPage[] {
  const sorted = [...lenses].sort((a, b) => a.focalLengthMin - b.focalLengthMin ||
    a.focalLengthMax - b.focalLengthMax ||
    (a.length?.mm ?? Infinity) - (b.length?.mm ?? Infinity) || a.id.localeCompare(b.id));
  const pages: PromoGroupPage[] = [];
  let groups: FocalGroup[] = [];
  let count = 0;
  let low = 0;
  let high = 0;
  let band = 0;
  function flush() {
    if (count) {pages.push({ range: focalRangeDisplay(low, high), groups });}
    groups = [];
    count = 0;
  }
  for (const lens of sorted) {
    const nextBand = starts.filter((start) => lens.focalLengthMin >= start).length;
    if (count === MAX_ROWS || nextBand !== band) {flush();}
    band = nextBand;
    const min = focalEquiv(lens.focalLengthMin, lens.mount);
    const max = focalEquiv(lens.focalLengthMax, lens.mount);
    const actual = focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax);
    if (!count) { low = min; high = max; }
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
  const reference = pickNewEntry(lens.pricing?.cn?.new);
  return {
    id: lens.id,
    name: lens.model,
    brand,
    focus: lens.af ? "AF" : "MF",
    length: lens.length?.mm?.toString() ?? "—",
    weight: weightDisplay(lens.weightG, "") ?? "—",
    referencePrice: reference?.currency === "CNY" ? `¥${formatReferenceAmount.format(reference.price)}` : undefined,
    image,
  };
}

export function promoPageNumber(page: number): string {
  return String(page).padStart(2, "0");
}

export function promoFileName(slug: string, page: number): string {
  return `${promoPageNumber(page)}-${slug}.png`;
}
