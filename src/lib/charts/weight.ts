import { chartLenses, type ChartLens } from "@/lib/charts/catalog";
import type { Lens } from "@/lib/types";

/** Heaviest first. Each tier takes lenses at or above its floor and below the previous floor. */
export const WEIGHT_TIERS = [
  { key: "cannon", minG: 1000 },
  { key: "heavy", minG: 500 },
  { key: "everyday", minG: 300 },
  { key: "light", minG: 150 },
  { key: "pocket", minG: 0 },
] as const;

export type WeightTierKey = (typeof WEIGHT_TIERS)[number]["key"];

export interface WeightTier {
  key: WeightTierKey;
  minG: number;
  /** Exclusive; absent on the heaviest tier. */
  maxG?: number;
  /** Heaviest first. */
  lenses: ChartLens[];
}

export interface WeightLadder {
  tiers: WeightTier[];
  count: number;
  heaviest?: ChartLens;
  lightest?: ChartLens;
  /** Heaviest over lightest, rounded to a whole number. */
  ratio?: number;
}

export function buildWeightLadder(lenses: Lens[]): WeightLadder {
  const pool = chartLenses(lenses).sort((a, b) => b.weightG - a.weightG || a.id.localeCompare(b.id));

  const tiers = WEIGHT_TIERS.map((tier, i) => {
    const maxG = i === 0 ? undefined : WEIGHT_TIERS[i - 1].minG;
    return {
      key: tier.key,
      minG: tier.minG,
      maxG,
      lenses: pool.filter((lens) => lens.weightG >= tier.minG && (maxG === undefined || lens.weightG < maxG)),
    };
  });

  const heaviest = pool[0];
  const lightest = pool[pool.length - 1];
  const ratio = heaviest && lightest ? Math.round(heaviest.weightG / lightest.weightG) : undefined;
  return { tiers, count: pool.length, heaviest, lightest, ratio };
}

/** A weight bar's length as a percentage of the heaviest lens's; square-rooted so light lenses stay visible. */
export function weightBarPct(weightG: number, heaviestG: number): number {
  return Math.round(Math.sqrt(weightG / heaviestG) * 100);
}
