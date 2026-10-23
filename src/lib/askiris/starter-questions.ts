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

export type StarterPool = keyof StarterPools;

/** An example question and the pool it was drawn from. */
export interface Starter {
  text: string;
  pool: StarterPool;
}

/** An example question about the page Iris opened over, worded for it rather than drawn from a pool. */
export interface PageStarter {
  text: string;
  pool: "page";
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
): Starter[] {
  const from = (pool: StarterPool, count: number) =>
    draw(pools[pool], count, random).map((text) => ({ text, pool }));
  const others = [
    from(audience.hasFavorites ? "favorites" : "compare", 1),
    from(audience.hasGear ? "gearKnown" : "gearUnknown", 1),
    from("table", 1),
    from("terms", 1),
    from("about", 1),
  ];
  if (compact) {
    return [...from("need", 1), ...draw(others, 2, random).flat()];
  }
  return [...from("need", 2), ...others.flat()];
}
