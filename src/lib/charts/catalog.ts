import { weightMid } from "@/lib/lens/alternatives";
import { focalEquiv, focalRangeDisplay } from "@/lib/lens/format";
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
  /** f-number at the wide end, falling back to the T-stop. */
  aperture?: number;
  /** f-number at the long end, when a zoom's aperture changes as it zooms. */
  apertureTele?: number;
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
    aperture: Array.isArray(aperture) ? aperture[0] : aperture,
    apertureTele: Array.isArray(aperture) ? aperture[1] : undefined,
    af: lens.af,
  };
}

/** The focal length and its full-frame equivalent, for the `focalSpec` message. */
export function focalSpecArgs(lens: ChartLens): { focal: string; equiv: string } {
  return {
    focal: focalRangeDisplay(lens.focalMin, lens.focalMax),
    equiv: focalRangeDisplay(lens.focalEquivMin, lens.focalEquivMax),
  };
}

/** The aperture as a chart labels it: "F1.4", or "F3.5–5.6" for a variable-aperture zoom. */
export function apertureLabel(lens: ChartLens): string | undefined {
  if (lens.aperture === undefined) {
    return undefined;
  }
  return lens.apertureTele === undefined ? `F${lens.aperture}` : `F${lens.aperture}–${lens.apertureTele}`;
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
