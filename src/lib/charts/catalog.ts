import { weightMid } from "@/lib/lens/alternatives";
import { focalEquiv, focalRangeDisplay } from "@/lib/lens/format";
import { getFocalCategoriesOf, type FocalCategory } from "@/lib/lens/lens";
import type { ApertureValue, Lens, Mount } from "@/lib/types";
import type { ChartSelection } from "@/lib/url/charts";

export const CHART_KINDS = ["timeline", "weight", "lineup"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

/** The fields a chart draws, small enough to hand to a client component. */
export interface ChartLens {
  id: string;
  mount: Mount;
  brand: string;
  series?: string;
  model: string;
  /** As the lens name gives it; every chart covers a single mount, so the scale is the same. */
  focalMin: number;
  focalMax: number;
  focalEquivMin: number;
  focalEquivMax: number;
  /** As the browse filter assigns them: a zoom gets every category its range touches. */
  focalCategories: FocalCategory[];
  /** The midpoint when the spec gives a range. */
  weightG: number;
  releaseYear?: number;
  /** Maximum f-number, a wide–tele pair when it changes as a zoom zooms; falls back to the T-stop. */
  aperture?: ApertureValue;
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
    focalMin: lens.focalLengthMin,
    focalMax: lens.focalLengthMax,
    focalEquivMin: focalEquiv(lens.focalLengthMin, lens.mount),
    focalEquivMax: focalEquiv(lens.focalLengthMax, lens.mount),
    focalCategories: getFocalCategoriesOf(lens),
    weightG: weightMid(lens.weightG),
    releaseYear: lens.releaseYear,
    aperture,
    af: lens.af,
  };
}

/** The full-frame equivalent focal length; the lens name already gives the physical one. */
export function focalEquivDisplay(lens: ChartLens): string {
  return focalRangeDisplay(lens.focalEquivMin, lens.focalEquivMax);
}

/** Whether a lens passes a chart's brand and focal-category filters. */
export function matchesChartSelection(lens: ChartLens, selection: ChartSelection): boolean {
  return (!selection.brand || lens.brand === selection.brand) && (!selection.focal || lens.focalCategories.includes(selection.focal));
}

/** Charts plot stills lenses only: cine lenses publish T-stops and would read as outliers. */
export function chartLenses(lenses: Lens[]): ChartLens[] {
  return lenses.filter((lens) => !lens.isCine).map(toChartLens);
}

/** Cine lenses the charts leave out, optionally for one brand. */
export function countCineLenses(lenses: Lens[], brand?: string): number {
  return lenses.filter((lens) => lens.isCine && (brand === undefined || lens.brand === brand)).length;
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
