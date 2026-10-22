import { chartLenses, countByBrand, equivFocalRange, widestAperture, type BrandCount } from "@/lib/charts/catalog";
import { weightMid } from "@/lib/lens/alternatives";
import { isZoom } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";

export const DEFAULT_LINEUP_BRAND = "fujifilm";

export interface LineupColumn {
  /** Equivalent focal length. */
  focal: number;
  /** Bottom of the stack first: the widest aperture ends up on top, ties broken lightest first. */
  lenses: Lens[];
}

export interface Lineup {
  brand: string;
  primes: LineupColumn[];
  /** Widest start first, then shortest reach. */
  zooms: Lens[];
  count: number;
  /** Equivalent focal span across the whole lineup. */
  focalMin: number;
  focalMax: number;
}

export function lineupBrands(lenses: Lens[]): BrandCount[] {
  return countByBrand(chartLenses(lenses));
}

export function buildLineup(lenses: Lens[], brand: string): Lineup | undefined {
  const pool = chartLenses(lenses).filter((lens) => lens.brand === brand);
  if (pool.length === 0) {
    return undefined;
  }

  const columns = new Map<number, Lens[]>();
  for (const lens of pool.filter((l) => !isZoom(l))) {
    const focal = equivFocalRange(lens).min;
    columns.set(focal, [...(columns.get(focal) ?? []), lens]);
  }
  const aperture = (lens: Lens) => widestAperture(lens) ?? Infinity;
  const primes = [...columns]
    .sort(([a], [b]) => a - b)
    .map(([focal, stack]) => ({
      focal,
      lenses: stack.sort(
        (a, b) => aperture(b) - aperture(a) || weightMid(a.weightG) - weightMid(b.weightG) || a.id.localeCompare(b.id),
      ),
    }));

  const zooms = pool
    .filter(isZoom)
    .sort((a, b) => a.focalLengthMin - b.focalLengthMin || a.focalLengthMax - b.focalLengthMax || a.id.localeCompare(b.id));

  const ranges = pool.map(equivFocalRange);
  return {
    brand,
    primes,
    zooms,
    count: pool.length,
    focalMin: Math.min(...ranges.map((r) => r.min)),
    focalMax: Math.max(...ranges.map((r) => r.max)),
  };
}
