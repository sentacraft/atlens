import collectionsData from "@/data/collections.json";
import { FILTERS, type LensFilter } from "@/lib/collection-filters";
import type { Lens } from "@/lib/types";

// Must not import the catalogue: a client component imports this module. Membership and
// counts live in collection-stats.

export interface LensCollection {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  filter: LensFilter;
  /** A chart the collection's question calls for, shown on its page. */
  chart?: CollectionChart;
}

export type CollectionChart = "weight" | "timeline";
const COLLECTION_CHARTS: readonly string[] = ["weight", "timeline"] satisfies CollectionChart[];

interface CollectionMeta {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  chart?: string;
}

export type CollectionGroup = keyof typeof collectionsData.groups;

const COLLECTION_GROUP_ORDER = Object.keys(collectionsData.groups) as CollectionGroup[];

function toCollection(entry: CollectionMeta): LensCollection {
  const filter = (FILTERS as Record<string, LensFilter | undefined>)[entry.slug];
  if (!filter) {
    throw new Error(`collections.json: "${entry.slug}" has no predicate in FILTERS`);
  }
  if (entry.chart !== undefined && !COLLECTION_CHARTS.includes(entry.chart)) {
    throw new Error(`collections.json: "${entry.slug}" has an unknown chart "${entry.chart}"`);
  }
  return {
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    shortDescription: entry.shortDescription,
    filter,
    chart: entry.chart as CollectionChart | undefined,
  };
}

interface CollectionGroupBlock {
  group: CollectionGroup;
  collections: LensCollection[];
}

export const COLLECTION_GROUPS: CollectionGroupBlock[] = COLLECTION_GROUP_ORDER.map((group) => ({
  group,
  collections: collectionsData.groups[group].map(toCollection),
}));

export const COLLECTIONS: Record<string, LensCollection> = Object.fromEntries(
  COLLECTION_GROUPS.flatMap((g) => g.collections).map((c) => [c.slug, c]),
);

for (const slug of Object.keys(FILTERS)) {
  if (!(slug in COLLECTIONS)) {
    throw new Error(`FILTERS: "${slug}" has no entry in collections.json`);
  }
}

/** The collection that holds the cine lenses the lens library and charts leave out. */
export const CINE_COLLECTION_SLUG = "cine";

export const FEATURED_COLLECTION_SLUGS = ["pancake", "under-200g", "fast-aperture-primes", "travel-zoom"] as const;

for (const slug of FEATURED_COLLECTION_SLUGS) {
  if (!(slug in COLLECTIONS)) {
    throw new Error(`FEATURED_COLLECTION_SLUGS: "${slug}" has no entry in collections.json`);
  }
}

export function getMemberCollections(lens: Lens, locale: string): LensCollection[] {
  return Object.values(COLLECTIONS).filter((collection) => collection.filter(lens, locale));
}

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

/** The series collection a lens belongs to, if its series has one. */
export function seriesCollection(lens: Lens, locale: string): LensCollection | undefined {
  return COLLECTION_GROUPS.find((g) => g.group === "series")?.collections.find((c) => c.filter(lens, locale));
}
