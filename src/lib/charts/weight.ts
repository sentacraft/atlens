import { chartLenses } from "@/lib/charts/catalog";
import { weightMid } from "@/lib/lens/alternatives";
import { getFocalCategoriesOf, type FocalCategory } from "@/lib/lens/lens";
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

export interface WeightEntry {
  lens: Lens;
  weightG: number;
}

export interface WeightTier {
  key: WeightTierKey;
  minG: number;
  /** Exclusive; absent on the heaviest tier. */
  maxG?: number;
  /** Heaviest first. */
  entries: WeightEntry[];
}

export interface WeightLadder {
  tiers: WeightTier[];
  count: number;
  heaviest?: WeightEntry;
  lightest?: WeightEntry;
  /** Heaviest over lightest, rounded to a whole number. */
  ratio?: number;
}

export function buildWeightLadder(lenses: Lens[]): WeightLadder {
  const entries = chartLenses(lenses)
    .map((lens) => ({ lens, weightG: weightMid(lens.weightG) }))
    .sort((a, b) => b.weightG - a.weightG || a.lens.id.localeCompare(b.lens.id));

  const tiers = WEIGHT_TIERS.map((tier, i) => {
    const maxG = i === 0 ? undefined : WEIGHT_TIERS[i - 1].minG;
    return {
      key: tier.key,
      minG: tier.minG,
      maxG,
      entries: entries.filter((e) => e.weightG >= tier.minG && (maxG === undefined || e.weightG < maxG)),
    };
  });

  const heaviest = entries[0];
  const lightest = entries[entries.length - 1];
  const ratio = heaviest && lightest ? Math.round(heaviest.weightG / lightest.weightG) : undefined;
  return { tiers, count: entries.length, heaviest, lightest, ratio };
}

/** A zoom matches every focal category its range touches. */
export function inFocalCategory(lens: Lens, category: FocalCategory): boolean {
  return getFocalCategoriesOf(lens).includes(category);
}
