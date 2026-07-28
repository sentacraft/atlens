import collectionsData from "@/data/collections.json";
import { FILTERS, type LensFilter } from "@/lib/collection-filters";
import type { Lens } from "@/lib/types";

// The collections themselves: metadata joined to predicates, plus the two lookups that
// take their lenses as an argument. Nothing here reaches for the catalogue — a client
// component imports this module, and anything that calls getAllLenses would ship 477KB
// of JSON to the browser with it. Membership and counts, which do need the catalogue,
// live in collection-stats.

export interface LensCollection {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  filter: LensFilter;
}

interface CollectionMeta {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
}

// Group slugs are the object KEYS of collections.json `groups`. Object keys keep
// their literal type through a JSON import (unlike array elements, which widen to
// string), so this is a real string-literal union — a consumer can type a
// per-group config as Record<CollectionGroup, …> and have the compiler guarantee
// every group is covered (and no extra ones).
export type CollectionGroup = keyof typeof collectionsData.groups;

// Display order of the groups = the key order in collections.json. (Group order,
// within-group order, and group membership all come from that one structure.)
const COLLECTION_GROUP_ORDER = Object.keys(collectionsData.groups) as CollectionGroup[];

// Join one JSON entry's metadata with its code-side predicate (forward check:
// a json entry must have a predicate in FILTERS).
function toCollection(entry: CollectionMeta): LensCollection {
  const filter = (FILTERS as Record<string, LensFilter | undefined>)[entry.slug];
  if (!filter) {
    throw new Error(`collections.json: "${entry.slug}" has no predicate in FILTERS`);
  }
  return {
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    shortDescription: entry.shortDescription,
    filter,
  };
}

interface CollectionGroupBlock {
  group: CollectionGroup;
  collections: LensCollection[];
}

// Collections grouped and ordered exactly as authored in collections.json.
export const COLLECTION_GROUPS: CollectionGroupBlock[] = COLLECTION_GROUP_ORDER.map((group) => ({
  group,
  collections: collectionsData.groups[group].map(toCollection),
}));

// slug -> collection, for direct lookups.
export const COLLECTIONS: Record<string, LensCollection> = Object.fromEntries(
  COLLECTION_GROUPS.flatMap((g) => g.collections).map((c) => [c.slug, c]),
);

// Reverse check: every predicate must have JSON metadata (catches a dead FILTERS
// entry that would otherwise go unnoticed). Forward check is in toCollection.
for (const slug of Object.keys(FILTERS)) {
  if (!(slug in COLLECTIONS)) {
    throw new Error(`FILTERS: "${slug}" has no entry in collections.json`);
  }
}

/**
 * Collections a single lens belongs to — i.e. whose predicate matches the lens.
 * Used on the lens detail page ("this lens appears in …"). Consumers that need a
 * lens count read it via `collectionLensCount` — it is not bundled here.
 */
export function getMemberCollections(lens: Lens, locale: string): LensCollection[] {
  return Object.values(COLLECTIONS).filter((collection) => collection.filter(lens, locale));
}

/**
 * Collections shared by ALL of the given lenses — i.e. whose predicate matches
 * every lens. Used on the compare page. Degenerate cases: zero lenses → none;
 * one lens → just that lens's member collections.
 */
export function getSharedCollections(lenses: Lens[], locale: string): LensCollection[] {
  if (lenses.length === 0) {
    return [];
  }
  if (lenses.length === 1) {
    return getMemberCollections(lenses[0], locale);
  }
  return Object.values(COLLECTIONS).filter((collection) =>
    lenses.every((lens) => collection.filter(lens, locale)),
  );
}
