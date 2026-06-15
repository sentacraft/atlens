import collectionsData from "@/data/collections.json";
import { FILTERS, type LensFilter, type CollectionSlug } from "@/lib/collection-filters";
import { getAllLenses } from "@/lib/lens/data";
import { routing } from "@/i18n/routing";
import type { Lens } from "@/lib/types";

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
export const COLLECTION_GROUP_ORDER = Object.keys(collectionsData.groups) as CollectionGroup[];

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

export interface CollectionGroupBlock {
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

// --- Membership, precomputed at module load -------------------------------
// slug -> member lenses, per locale (price collections vary by region: cn vs
// global pricing). Computed eagerly once here — no lazy cache — so every count /
// overlap / stats lookup below is a plain array read instead of re-scanning the
// whole catalog on each call.
const MEMBERS: Record<string, Record<CollectionSlug, Lens[]>> = {};
for (const locale of routing.locales) {
  const all = getAllLenses(locale);
  const perSlug = {} as Record<CollectionSlug, Lens[]>;
  for (const slug of Object.keys(FILTERS) as CollectionSlug[]) {
    perSlug[slug] = all.filter((lens) => FILTERS[slug](lens, locale));
  }
  MEMBERS[locale] = perSlug;
}

function membersOf(slug: string, locale: string): Lens[] {
  return MEMBERS[locale]?.[slug as CollectionSlug] ?? [];
}

export function getRelatedCollections(
  slug: string,
  locale: string,
  limit = 4,
): LensCollection[] {
  if (!COLLECTIONS[slug]) {
    return [];
  }
  const currentIds = new Set(membersOf(slug, locale).map((l) => l.id));
  if (currentIds.size === 0) {
    return [];
  }

  const scored = Object.values(COLLECTIONS)
    .filter((c) => c.slug !== slug)
    .map((c) => ({
      collection: c,
      overlap: membersOf(c.slug, locale).filter((l) => currentIds.has(l.id)).length,
    }));

  scored.sort((a, b) => b.overlap - a.overlap);
  return scored
    .filter((s) => s.overlap > 0)
    .slice(0, limit)
    .map((s) => s.collection);
}

export interface CollectionStats {
  collection: LensCollection;
  lenses: Lens[];
  lensCount: number;
  brandCount: number;
}

export function getCollectionStats(slug: string, locale: string): CollectionStats | null {
  const collection = COLLECTIONS[slug];
  if (!collection) {
    return null;
  }
  const lenses = membersOf(slug, locale);
  return {
    collection,
    lenses,
    lensCount: lenses.length,
    brandCount: new Set(lenses.map((l) => l.brand)).size,
  };
}

// Lens count for a collection in the given locale (index-page lists).
export function collectionLensCount(slug: string, locale: string): number {
  return membersOf(slug, locale).length;
}

export interface RelatedCollectionStats {
  collection: LensCollection;
  previewLens: Lens;
  lensCount: number;
  brandCount: number;
}

export function getRelatedCollectionsWithStats(
  slug: string,
  locale: string,
  limit = 4,
): RelatedCollectionStats[] {
  return getRelatedCollections(slug, locale, limit).map((c) => {
    const ls = membersOf(c.slug, locale);
    return {
      collection: c,
      previewLens: ls[0],
      lensCount: ls.length,
      brandCount: new Set(ls.map((l) => l.brand)).size,
    };
  });
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
