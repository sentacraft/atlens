import { chartBrands, chartLenses } from "@/lib/charts/catalog";
import { buildLineup } from "@/lib/charts/lineup";
import { buildTimeline } from "@/lib/charts/timeline";
import { buildWeightLadder } from "@/lib/charts/weight";
import type { Lens } from "@/lib/types";

/** The brand whose lineup stands for the brand lineups chart; the preview shows its shape, not its name. */
export const PREVIEW_LINEUP_BRAND = "fujifilm";

/** How many weights the weight ladder preview draws, spread evenly from heaviest to lightest. */
const WEIGHT_PREVIEW_ROWS = 9;

/** A lens as a mark on a focal axis: a point for a prime, a span for a zoom. */
export interface FocalMark {
  focalMin: number;
  focalMax: number;
}

/** What the home page's chart cards draw: each chart's own layout, reduced to plain marks. */
export interface ChartPreviews {
  timeline: { first: number; last: number; count: number; marks: (FocalMark & { year: number })[] };
  weight: { count: number; heaviestG: number; lightestG: number; sampleG: number[] };
  lineup: { brandCount: number; primes: { focal: number; count: number }[]; zooms: FocalMark[] };
  /** The focal span every preview's axis covers. */
  focalMin: number;
  focalMax: number;
}

export function buildChartPreviews(lenses: Lens[]): ChartPreviews | undefined {
  const timeline = buildTimeline(lenses);
  const ladder = buildWeightLadder(lenses);
  const lineup = buildLineup(lenses, PREVIEW_LINEUP_BRAND);
  const first = timeline.years[0]?.year;
  const last = timeline.years.at(-1)?.year;
  if (first === undefined || last === undefined || !ladder.heaviest || !ladder.lightest || !lineup) {
    return undefined;
  }

  const weights = ladder.tiers.flatMap((tier) => tier.lenses.map((lens) => lens.weightG));
  const sampleG = Array.from({ length: WEIGHT_PREVIEW_ROWS }, (_, i) =>
    weights[Math.round((i * (weights.length - 1)) / (WEIGHT_PREVIEW_ROWS - 1))],
  );
  const focals = chartLenses(lenses).flatMap((lens) => [lens.focalMin, lens.focalMax]);

  return {
    timeline: {
      first,
      last,
      count: timeline.entries.length,
      marks: timeline.entries.map(({ lens, year }) => ({ year, focalMin: lens.focalMin, focalMax: lens.focalMax })),
    },
    weight: { count: ladder.count, heaviestG: ladder.heaviest.weightG, lightestG: ladder.lightest.weightG, sampleG },
    lineup: {
      brandCount: chartBrands(lenses).length,
      primes: lineup.primes.map(({ focal, lenses: stack }) => ({ focal, count: stack.length })),
      zooms: lineup.zooms.map((lens) => ({ focalMin: lens.focalMin, focalMax: lens.focalMax })),
    },
    focalMin: Math.min(...focals),
    focalMax: Math.max(...focals),
  };
}
