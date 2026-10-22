import { focalEquiv } from "@/lib/lens/format";
import type { Lens } from "@/lib/types";

export const CHART_KINDS = ["timeline", "weight", "lineup"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export interface BrandCount {
  brand: string;
  count: number;
}

/** Charts plot stills lenses only: cine lenses publish T-stops and would read as outliers. */
export function chartLenses(lenses: Lens[]): Lens[] {
  return lenses.filter((lens) => !lens.isCine);
}

export function equivFocalRange(lens: Lens): { min: number; max: number } {
  return {
    min: focalEquiv(lens.focalLengthMin, lens.mount),
    max: focalEquiv(lens.focalLengthMax, lens.mount),
  };
}

/** The f-number at the wide end, falling back to the T-stop. */
export function widestAperture(lens: Lens): number | undefined {
  const value = lens.maxAperture ?? lens.maxTStop;
  return Array.isArray(value) ? value[0] : value;
}

/** Most lenses first, then by slug so the order is stable. */
export function countByBrand(lenses: Lens[]): BrandCount[] {
  const counts = new Map<string, number>();
  for (const lens of lenses) {
    counts.set(lens.brand, (counts.get(lens.brand) ?? 0) + 1);
  }
  return [...counts]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
}
