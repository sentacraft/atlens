import type { Mount } from "@/lib/types";

/** Full-frame equivalent multipliers: X is APS-C, G is 44×33mm medium format. */
export const CROP_FACTOR: Record<Mount, number> = { X: 1.5, G: 0.79 };

export interface CoverageInput {
  id: string;
  label: string;
  mount: Mount;
  focalMinMm: number;
  focalMaxMm: number;
  manual: boolean;
}

export interface CoverageRow extends CoverageInput {
  equivalentMin: number;
  equivalentMax: number;
}

export interface CoverageAxis {
  min: number;
  max: number;
  ticks: number[];
}

const TICKS = [15, 24, 35, 50, 85, 135, 200, 300, 400, 600, 800, 1200];

export function equivalentFocal(mm: number, mount: Mount): number {
  return Math.round(mm * CROP_FACTOR[mount]);
}

/** Rows sorted from the widest lens, each with its full-frame equivalent range. */
export function coverageRows(lenses: CoverageInput[]): CoverageRow[] {
  return lenses
    .map((lens) => ({
      ...lens,
      equivalentMin: equivalentFocal(lens.focalMinMm, lens.mount),
      equivalentMax: equivalentFocal(lens.focalMaxMm, lens.mount),
    }))
    .sort((a, b) => a.equivalentMin - b.equivalentMin || a.equivalentMax - b.equivalentMax);
}

/** A log axis from 15mm (or wider) to at least 135mm, so a single lens still sits in context. */
export function coverageAxis(rows: CoverageRow[]): CoverageAxis {
  const min = Math.min(15, ...rows.map((row) => row.equivalentMin));
  const max = Math.max(135, ...rows.map((row) => row.equivalentMax));
  // The axis end is always labelled; a stock tick within 12% of the axis from it would collide.
  const span = Math.log(max / min);
  const ticks = [...TICKS.filter((tick) => tick >= min && Math.log(max / tick) / span >= 0.12), max];
  return { min, max, ticks };
}

/** Where a focal length falls on the axis, from 0 to 1. */
export function axisPosition(mm: number, axis: CoverageAxis): number {
  return Math.log(mm / axis.min) / Math.log(axis.max / axis.min);
}

/** The widest equivalent focal length covered, when it leaves the ultra-wide end uncovered. */
export function wideGap(rows: CoverageRow[], axis: CoverageAxis): number | undefined {
  const widest = rows[0]?.equivalentMin;
  return widest !== undefined && widest > axis.min ? widest : undefined;
}
