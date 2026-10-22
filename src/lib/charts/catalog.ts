import { weightMid } from "@/lib/lens/alternatives";
import { focalEquiv } from "@/lib/lens/format";
import { getFocalCategoriesOf, type FocalCategory } from "@/lib/lens/lens";
import type { Lens, Mount } from "@/lib/types";

export const CHART_KINDS = ["timeline", "weight", "lineup"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

/** The fields a chart draws, small enough to hand to a client component. */
export interface ChartLens {
  id: string;
  mount: Mount;
  brand: string;
  series?: string;
  model: string;
  /** Full-frame equivalent. */
  focalMin: number;
  focalMax: number;
  /** As the browse filter assigns them: a zoom gets every category its range touches. */
  focalCategories: FocalCategory[];
  /** The midpoint when the spec gives a range. */
  weightG: number;
  releaseYear?: number;
  /** f-number at the wide end, falling back to the T-stop. */
  aperture?: number;
  af: boolean;
}

export interface BrandCount {
  brand: string;
  count: number;
}

export function toChartLens(lens: Lens): ChartLens {
  const aperture = lens.maxAperture ?? lens.maxTStop;
  return {
    id: lens.id,
    mount: lens.mount,
    brand: lens.brand,
    series: lens.series,
    model: lens.model,
    focalMin: focalEquiv(lens.focalLengthMin, lens.mount),
    focalMax: focalEquiv(lens.focalLengthMax, lens.mount),
    focalCategories: getFocalCategoriesOf(lens),
    weightG: weightMid(lens.weightG),
    releaseYear: lens.releaseYear,
    aperture: Array.isArray(aperture) ? aperture[0] : aperture,
    af: lens.af,
  };
}

/** Charts plot stills lenses only: cine lenses publish T-stops and would read as outliers. */
export function chartLenses(lenses: Lens[]): ChartLens[] {
  return lenses.filter((lens) => !lens.isCine).map(toChartLens);
}

export function isChartZoom(lens: ChartLens): boolean {
  return lens.focalMin !== lens.focalMax;
}

/** Brands with stills lenses, most lenses first. */
export function chartBrands(lenses: Lens[]): BrandCount[] {
  return countByBrand(chartLenses(lenses));
}

/** Most lenses first, then by slug so the order is stable. */
export function countByBrand(lenses: ChartLens[]): BrandCount[] {
  const counts = new Map<string, number>();
  for (const lens of lenses) {
    counts.set(lens.brand, (counts.get(lens.brand) ?? 0) + 1);
  }
  return [...counts]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
}
