import { chartLenses, countByBrand, equivFocalRange, type BrandCount } from "@/lib/charts/catalog";
import type { Lens } from "@/lib/types";

export interface TimelineEntry {
  lens: Lens;
  year: number;
  focalMin: number;
  focalMax: number;
  /** Geometric middle of the equivalent range: where a zoom's image sits on a log axis. */
  focalMid: number;
}

export interface TimelineYear {
  year: number;
  count: number;
}

export interface Timeline {
  entries: TimelineEntry[];
  /** Every year from the first release to the last, including years with no release. */
  years: TimelineYear[];
  brands: BrandCount[];
  /** Brands with no lens that has a release year, so they are absent from the chart. */
  brandsWithoutYear: string[];
}

export function buildTimeline(lenses: Lens[]): Timeline {
  const pool = chartLenses(lenses);
  const dated = pool.filter((lens): lens is Lens & { releaseYear: number } => lens.releaseYear !== undefined);

  const entries = dated
    .map((lens) => {
      const { min, max } = equivFocalRange(lens);
      return { lens, year: lens.releaseYear, focalMin: min, focalMax: max, focalMid: Math.sqrt(min * max) };
    })
    .sort((a, b) => a.year - b.year || a.focalMid - b.focalMid || a.lens.id.localeCompare(b.lens.id));

  const years: TimelineYear[] = [];
  if (entries.length > 0) {
    const first = entries[0].year;
    const last = entries[entries.length - 1].year;
    for (let year = first; year <= last; year++) {
      years.push({ year, count: entries.filter((entry) => entry.year === year).length });
    }
  }

  const datedBrands = new Set(dated.map((lens) => lens.brand));
  const brandsWithoutYear = countByBrand(pool)
    .map(({ brand }) => brand)
    .filter((brand) => !datedBrands.has(brand));

  return { entries, years, brands: countByBrand(dated), brandsWithoutYear };
}

/**
 * Greedy lane packing: each item takes the first lane where it sits at least `minGap` from every
 * item already there. Returns the lane index of each item, in input order.
 */
export function assignLanes<T>(items: T[], position: (item: T) => number, minGap: number): number[] {
  const lanes: number[][] = [];
  return items.map((item) => {
    const p = position(item);
    let lane = lanes.findIndex((taken) => taken.every((q) => Math.abs(q - p) >= minGap));
    if (lane < 0) {
      lanes.push([]);
      lane = lanes.length - 1;
    }
    lanes[lane].push(p);
    return lane;
  });
}
