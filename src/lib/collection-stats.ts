import "server-only";
import { FILTERS, type CollectionSlug } from "@/lib/collection-filters";
import { COLLECTION_GROUPS, COLLECTIONS, FEATURED_COLLECTION_SLUGS, type LensCollection } from "@/lib/collections";
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

function middleByFocal(lenses: Lens[]): Lens {
  const sorted = [...lenses].sort(
    (a, b) => a.focalLengthMin + a.focalLengthMax - (b.focalLengthMin + b.focalLengthMax) || a.id.localeCompare(b.id),
  );
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * A collection's cover lens: a Fujifilm one if it has any, else one from its largest brand, taking
 * the middle focal length so a fisheye or a super-telephoto rarely stands for the set. Lenses in
 * `used` are passed over while others remain, so a list of collections doesn't repeat a picture.
 */
function pickCover(members: Lens[], used: Set<string>): Lens {
  const fresh = members.filter((l) => !used.has(l.id));
  const candidates = fresh.length > 0 ? fresh : members;
  const fujifilm = candidates.filter((l) => l.brand === "fujifilm");
  if (fujifilm.length > 0) {
    return middleByFocal(fujifilm);
  }
  const byBrand = new Map<string, Lens[]>();
  for (const lens of candidates) {
    byBrand.set(lens.brand, [...(byBrand.get(lens.brand) ?? []), lens]);
  }
  const [, largest] = [...byBrand].sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))[0];
  return middleByFocal(largest);
}

// One cover per collection for the whole site, smallest collections choosing first since they
// have the fewest lenses to choose from.
const COVERS: Record<string, Record<string, Lens>> = {};
for (const locale of routing.locales) {
  const used = new Set<string>();
  const covers: Record<string, Lens> = {};
  const slugs = (Object.keys(FILTERS) as CollectionSlug[])
    .filter((slug) => membersOf(slug, locale).length > 0)
    .sort((a, b) => membersOf(a, locale).length - membersOf(b, locale).length || a.localeCompare(b));
  for (const slug of slugs) {
    const cover = pickCover(membersOf(slug, locale), used);
    used.add(cover.id);
    covers[slug] = cover;
  }
  COVERS[locale] = covers;
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
  return { collection, ...statsFor(collection, locale) };
}

/** What a link to a collection shows: one of its lenses as a preview, and its counts. */
export interface CollectionSummary {
  collection: LensCollection;
  previewLens: Pick<Lens, "id" | "mount">;
  lensCount: number;
  brandCount: number;
}

function preview(lens: Lens): CollectionSummary["previewLens"] {
  return { id: lens.id, mount: lens.mount };
}

function previewOf(collection: LensCollection, locale: string): CollectionPreview {
  const { lensCount, brandCount } = statsFor(collection, locale);
  return { previewLens: preview(COVERS[locale][collection.slug]), lensCount, brandCount };
}

function summarize(collection: LensCollection, locale: string): CollectionSummary {
  return { collection, ...previewOf(collection, locale) };
}

/** A summary without the collection itself, which holds a filter function and so can't reach a client component. */
export type CollectionPreview = Omit<CollectionSummary, "collection">;

/** Every collection that has lenses in this locale, by slug. */
export function getCollectionPreviews(locale: string): Record<string, CollectionPreview> {
  return Object.fromEntries(
    Object.values(COLLECTIONS)
      .filter((collection) => membersOf(collection.slug, locale).length > 0)
      .map((collection) => [collection.slug, previewOf(collection, locale)]),
  );
}

export function getRelatedCollectionsWithStats(slug: string, locale: string, limit = 4): CollectionSummary[] {
  return getRelatedCollections(slug, locale, limit).map((collection) => summarize(collection, locale));
}

export function getFeaturedCollectionsWithStats(locale: string): CollectionSummary[] {
  return FEATURED_COLLECTION_SLUGS.map((slug) => summarize(COLLECTIONS[slug], locale));
}

/** Theme collections holding a brand's lenses, those with the most of them first, each previewed by a different one of them where it can. */
export function getBrandCollectionsWithStats(brand: string, locale: string, limit = 6): CollectionSummary[] {
  const used = new Set<string>();
  const ownSeries = new Set(getBrandSeries(brand, locale).map((series) => series.collection.slug));
  return Object.values(COLLECTIONS)
    .filter((collection) => !ownSeries.has(collection.slug))
    .map((collection) => ({ collection, own: membersOf(collection.slug, locale).filter((l) => l.brand === brand) }))
    .filter(({ own }) => own.length > 0)
    .sort((a, b) => b.own.length - a.own.length)
    .slice(0, limit)
    .map(({ collection, own }) => {
      const cover = pickCover(own, used);
      used.add(cover.id);
      return { ...summarize(collection, locale), previewLens: preview(cover) };
    });
}

/** A series collection: one brand's own line, listed under that brand rather than among the themes. */
export interface SeriesSummary {
  collection: LensCollection;
  brand: string;
  /** The line's name as the maker writes it, such as "XF". */
  name: string;
  lensCount: number;
}

/** Every series that has lenses in this locale. Its brand and name are the ones its lenses share. */
export function getSeries(locale: string): SeriesSummary[] {
  const series = COLLECTION_GROUPS.find(({ group }) => group === "series")?.collections ?? [];
  return series.flatMap((collection) => {
    const [first, ...rest] = membersOf(collection.slug, locale);
    if (!first?.series) {
      return [];
    }
    return [{ collection, brand: first.brand, name: first.series, lensCount: rest.length + 1 }];
  });
}

export function getBrandSeries(brand: string, locale: string): SeriesSummary[] {
  return getSeries(locale).filter((series) => series.brand === brand);
}

/** The brand a series collection belongs to; undefined for any other collection. */
export function getSeriesBrand(slug: string, locale: string): string | undefined {
  return getSeries(locale).find((series) => series.collection.slug === slug)?.brand;
}
