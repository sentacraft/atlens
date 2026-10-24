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

/** Everyday things whose weight people know by hand, set among the lenses so a number reads as something held. */
export const WEIGHT_REFERENCES = [
  { key: "cola2l", weightG: 2100 },
  { key: "water750", weightG: 770 },
  { key: "water500", weightG: 520 },
  { key: "colaCan", weightG: 350 },
  { key: "milk250", weightG: 260 },
  { key: "apple", weightG: 200 },
  { key: "banana", weightG: 150 },
  { key: "soap", weightG: 100 },
  { key: "egg", weightG: 50 },
] as const;

export type WeightReference = (typeof WEIGHT_REFERENCES)[number];

/** One line of the ladder: a lens with its rank among all lenses, heaviest first, or a reference. */
export type LadderRow = { kind: "lens"; lens: ChartLens; rank: number } | { kind: "reference"; reference: WeightReference };

export interface WeightTier {
  key: WeightTierKey;
  minG: number;
  /** Exclusive; absent on the heaviest tier. */
  maxG?: number;
  /** Heaviest first. */
  lenses: ChartLens[];
  /** The tier's lenses with each reference in its range placed after the last lens at least as heavy. */
  rows: LadderRow[];
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

  const rank = new Map(pool.map((lens, i) => [lens.id, i + 1]));
  const tiers = WEIGHT_TIERS.map((tier, i) => {
    const maxG = i === 0 ? undefined : WEIGHT_TIERS[i - 1].minG;
    const inTier = (weightG: number) => weightG >= tier.minG && (maxG === undefined || weightG < maxG);
    const lenses = pool.filter((lens) => inTier(lens.weightG));
    return { key: tier.key, minG: tier.minG, maxG, lenses, rows: mergeRows(lenses, rank, WEIGHT_REFERENCES.filter((ref) => inTier(ref.weightG))) };
  });

  const heaviest = pool[0];
  const lightest = pool[pool.length - 1];
  const ratio = heaviest && lightest ? Math.round(heaviest.weightG / lightest.weightG) : undefined;
  return { tiers, count: pool.length, heaviest, lightest, ratio };
}

/**
 * A short ranked list for a handful of lenses, as a collection page shows it: ranks count within
 * the set, and only references from the set's lightest weight up to its heaviest come along,
 * plus one just under the lightest so the light end has something to hold.
 */
export function rankedRows(lenses: Lens[]): LadderRow[] {
  const pool = chartLenses(lenses).sort((a, b) => b.weightG - a.weightG || a.id.localeCompare(b.id));
  if (pool.length === 0) {
    return [];
  }
  const heaviest = pool[0].weightG;
  const lightest = pool[pool.length - 1].weightG;
  const below = WEIGHT_REFERENCES.find((ref) => ref.weightG < lightest);
  const references = WEIGHT_REFERENCES.filter((ref) => (ref.weightG >= lightest && ref.weightG <= heaviest) || ref === below);
  return mergeRows(pool, new Map(pool.map((lens, i) => [lens.id, i + 1])), references);
}

function mergeRows(lenses: ChartLens[], rank: Map<string, number>, references: readonly WeightReference[]): LadderRow[] {
  return [
    ...lenses.map((lens) => ({ kind: "lens" as const, lens, rank: rank.get(lens.id) ?? 0 })),
    ...references.map((reference) => ({ kind: "reference" as const, reference })),
  ].sort((a, b) => rowWeight(b) - rowWeight(a) || (a.kind === b.kind ? 0 : a.kind === "lens" ? -1 : 1));
}

function rowWeight(row: LadderRow): number {
  return row.kind === "lens" ? row.lens.weightG : row.reference.weightG;
}

/** A weight bar's length as a percentage of the heaviest lens's, in proportion, never under 1%. */
export function weightBarPct(weightG: number, heaviestG: number): number {
  return Math.max(1, Math.round((weightG / heaviestG) * 100));
}
