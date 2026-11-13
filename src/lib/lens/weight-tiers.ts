/** Heaviest first. Each floor is the next lighter tier's exclusive cap. */
export const WEIGHT_TIERS = [
  { key: "cannon", minG: 1000 },
  { key: "heavy", minG: 500 },
  { key: "everyday", minG: 300 },
  { key: "light", minG: 150 },
  { key: "pocket", minG: 0 },
] as const;

export type WeightTierKey = (typeof WEIGHT_TIERS)[number]["key"];

export const WEIGHT_LIMIT_PRESETS = WEIGHT_TIERS.slice(1)
  .map(({ key }, index) => ({ key, grams: WEIGHT_TIERS[index].minG }))
  .reverse();
