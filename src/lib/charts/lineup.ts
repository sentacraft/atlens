import { chartLenses, isChartZoom, type ChartLens } from "@/lib/charts/catalog";
import type { Lens } from "@/lib/types";

export const DEFAULT_LINEUP_BRAND = "fujifilm";

export interface LineupColumn {
  /** Equivalent focal length. */
  focal: number;
  /** Bottom of the stack first: the widest aperture ends up on top, ties broken lightest first. */
  lenses: ChartLens[];
}

export interface Lineup {
  brand: string;
  primes: LineupColumn[];
  /** Widest start first, then shortest reach. */
  zooms: ChartLens[];
  count: number;
  /** Equivalent focal span across the whole lineup. */
  focalMin: number;
  focalMax: number;
}

export function buildLineup(lenses: Lens[], brand: string): Lineup | undefined {
  const pool = chartLenses(lenses).filter((lens) => lens.brand === brand);
  if (pool.length === 0) {
    return undefined;
  }

  const columns = new Map<number, ChartLens[]>();
  for (const lens of pool.filter((l) => !isChartZoom(l))) {
    columns.set(lens.focalMin, [...(columns.get(lens.focalMin) ?? []), lens]);
  }
  const aperture = (lens: ChartLens) => lens.aperture ?? Infinity;
  const primes = [...columns]
    .sort(([a], [b]) => a - b)
    .map(([focal, stack]) => ({
      focal,
      lenses: stack.sort((a, b) => aperture(b) - aperture(a) || a.weightG - b.weightG || a.id.localeCompare(b.id)),
    }));

  const zooms = pool
    .filter(isChartZoom)
    .sort((a, b) => a.focalMin - b.focalMin || a.focalMax - b.focalMax || a.id.localeCompare(b.id));

  return {
    brand,
    primes,
    zooms,
    count: pool.length,
    focalMin: Math.min(...pool.map((l) => l.focalMin)),
    focalMax: Math.max(...pool.map((l) => l.focalMax)),
  };
}
