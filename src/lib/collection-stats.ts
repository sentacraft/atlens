import "server-only";
import { FILTERS, type CollectionSlug } from "@/lib/collection-filters";
import { COLLECTIONS, FEATURED_COLLECTION_SLUGS, type LensCollection } from "@/lib/collections";
import { getAllLenses } from "@/lib/lens/data";
import { routing } from "@/i18n/routing";
import type { Lens } from "@/lib/types";

// Kept apart from collections.ts, which a client component imports; `server-only` makes a
// client import of this file a build error.

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

function getRelatedCollections(slug: string, locale: string, limit = 4): LensCollection[] {
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

function statsFor(collection: LensCollection, locale: string) {
  const lenses = membersOf(collection.slug, locale);
  return { lenses, lensCount: lenses.length, brandCount: new Set(lenses.map((l) => l.brand)).size };
}

interface CollectionStats {
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
  return { collection, ...statsFor(collection, locale) };
}

interface RelatedCollectionStats {
  collection: LensCollection;
  previewLens: Lens;
  lensCount: number;
  brandCount: number;
}

export function getCollectionLensCounts(locale: string): Record<string, number> {
  return Object.fromEntries(
    Object.keys(COLLECTIONS).map((slug) => [slug, membersOf(slug, locale).length]),
  );
}

function withPreview(collection: LensCollection, locale: string): RelatedCollectionStats {
  const { lenses, lensCount, brandCount } = statsFor(collection, locale);
  return { collection, previewLens: lenses[0], lensCount, brandCount };
}

export function getRelatedCollectionsWithStats(
  slug: string,
  locale: string,
  limit = 4,
): RelatedCollectionStats[] {
  return getRelatedCollections(slug, locale, limit).map((collection) => withPreview(collection, locale));
}

export function getFeaturedCollectionsWithStats(locale: string): RelatedCollectionStats[] {
  return FEATURED_COLLECTION_SLUGS.map((slug) => withPreview(COLLECTIONS[slug], locale));
}

/** Theme collections holding a brand's lenses, those with the most of them first, previewed by one of them. */
export function getBrandCollectionsWithStats(brand: string, locale: string, limit = 6): RelatedCollectionStats[] {
  return Object.values(COLLECTIONS)
    .map((collection) => ({ collection, own: membersOf(collection.slug, locale).filter((l) => l.brand === brand) }))
    .filter(({ own }) => own.length > 0)
    .sort((a, b) => b.own.length - a.own.length)
    .slice(0, limit)
    .map(({ collection, own }) => ({ ...withPreview(collection, locale), previewLens: own[0] }));
}
