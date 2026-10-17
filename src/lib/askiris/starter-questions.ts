/** Example questions Iris can start from, one pool per thing Iris can do. */
export interface StarterPools {
  /** Find lenses for a need: two are shown. */
  need: string[];
  compare: string[];
  /** Only for signed-in users with favorites, in place of a compare question. */
  favorites: string[];
  /** Gear questions for visitors whose gear Iris does not know. */
  gearUnknown: string[];
  /** Gear questions for signed-in users with gear in their profile. */
  gearKnown: string[];
  table: string[];
  terms: string[];
  about: string[];
}

export interface StarterAudience {
  hasGear: boolean;
  hasFavorites: boolean;
}

/** A seeded generator (mulberry32), so the server and the hydrating client draw the same questions. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function draw<T>(pool: T[], count: number, random: () => number): T[] {
  const left = [...pool];
  const picked: T[] = [];
  while (picked.length < count && left.length > 0) {
    picked.push(...left.splice(Math.floor(random() * left.length), 1));
  }
  return picked;
}

/**
 * One question from each pool, two from `need`: seven in all. `compact` keeps one need question
 * and two from the other pools, for narrow places.
 */
export function pickStarters(
  pools: StarterPools,
  audience: StarterAudience,
  random: () => number,
  { compact }: { compact: boolean },
): string[] {
  const others = [
    draw(audience.hasFavorites ? pools.favorites : pools.compare, 1, random),
    draw(audience.hasGear ? pools.gearKnown : pools.gearUnknown, 1, random),
    draw(pools.table, 1, random),
    draw(pools.terms, 1, random),
    draw(pools.about, 1, random),
  ];
  if (compact) {
    return [...draw(pools.need, 1, random), ...draw(others, 2, random).flat()];
  }
  return [...draw(pools.need, 2, random), ...others.flat()];
}
