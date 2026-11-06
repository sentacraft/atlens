/** Example questions Iris can start from, one pool per thing Iris can do. */
export interface StarterPools {
  /** A scene in a word or two ("Traveling"): Iris answers with the choice card. Two are shown. */
  need: string[];
  /** A need with a budget, a limit or a purpose, and no gear of the visitor's own. */
  brief: string[];
  compare: string[];
  /** Only for signed-in users with favorites, in place of a compare question. */
  favorites: string[];
  /** Gear questions for visitors whose gear Iris does not know. */
  gearUnknown: string[];
  /** Gear questions for signed-in users with gear in their profile. */
  gearKnown: string[];
  table: string[];
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
 * Two scenes, a brief, a compare (or favorites) question, and one of gear or table: five in all.
 * `compact` keeps one scene and two from the other pools, for narrow places.
 */
export function pickStarters(
  pools: StarterPools,
  audience: StarterAudience,
  random: () => number,
  { compact }: { compact: boolean },
): Starter[] {
  const from = (pool: StarterPool, count: number) =>
    draw(pools[pool], count, random).map((text) => ({ text, pool }));
  const brief = from("brief", 1);
  const compare = from(audience.hasFavorites ? "favorites" : "compare", 1);
  const gearOrTable = draw(
    [from(audience.hasGear ? "gearKnown" : "gearUnknown", 1), from("table", 1)],
    1,
    random,
  ).flat();
  if (compact) {
    return [...from("need", 1), ...draw([brief, compare, gearOrTable], 2, random).flat()];
  }
  return [...from("need", 2), ...brief, ...compare, ...gearOrTable];
}
