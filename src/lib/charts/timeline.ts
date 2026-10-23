import { chartLenses, countByBrand, type BrandCount, type ChartLens } from "@/lib/charts/catalog";
import type { Lens } from "@/lib/types";

export interface TimelineEntry {
  lens: ChartLens;
  year: number;
  /** Geometric middle of the equivalent range: where a zoom's image sits on a log axis. */
  focalMid: number;
}

export interface TimelineYear {
  year: number;
  count: number;
  /** That year's lenses per brand, brands in the chart's overall order, empty ones left out. */
  byBrand: BrandCount[];
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
  const dated = pool.filter((lens): lens is ChartLens & { releaseYear: number } => lens.releaseYear !== undefined);

  const entries = dated
    .map((lens) => ({ lens, year: lens.releaseYear, focalMid: Math.sqrt(lens.focalMin * lens.focalMax) }))
    .sort((a, b) => a.year - b.year || a.focalMid - b.focalMid || a.lens.id.localeCompare(b.lens.id));

  const brands = countByBrand(dated);
  const years: TimelineYear[] = [];
  if (entries.length > 0) {
    const first = entries[0].year;
    const last = entries[entries.length - 1].year;
    for (let year = first; year <= last; year++) {
      const ofYear = entries.filter((entry) => entry.year === year);
      const byBrand = brands
        .map(({ brand }) => ({ brand, count: ofYear.filter((entry) => entry.lens.brand === brand).length }))
        .filter(({ count }) => count > 0);
      years.push({ year, count: ofYear.length, byBrand });
    }
  }

  const datedBrands = new Set(dated.map((lens) => lens.brand));
  const brandsWithoutYear = countByBrand(pool)
    .map(({ brand }) => brand)
    .filter((brand) => !datedBrands.has(brand));

  return { entries, years, brands, brandsWithoutYear };
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
