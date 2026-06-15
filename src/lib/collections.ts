import collectionsData from "@/data/collections.json";
import { FILTERS, type LensFilter, type CollectionSlug } from "@/lib/collection-filters";
import type { Lens } from "@/lib/types";

export interface LensCollection {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  filter: LensFilter;
}

// Join JSON metadata with the code-side predicates by slug, validated BOTH ways
// at module load so the two files can never silently drift.
const parsed: LensCollection[] = collectionsData.collections.map((entry) => {
  // Forward: a collections.json entry must have a predicate.
  const filter = (FILTERS as Record<string, LensFilter | undefined>)[entry.slug];
  if (!filter) {
    throw new Error(`collections.json: "${entry.slug}" has no predicate in FILTERS`);
  }
  return { slug: entry.slug, title: entry.title, description: entry.description, shortDescription: entry.shortDescription, filter };
});

// Reverse: every predicate must have JSON metadata (catches a dead FILTERS entry
// that would otherwise go unnoticed).
const metaSlugs = new Set(collectionsData.collections.map((c) => c.slug));
for (const slug of Object.keys(FILTERS)) {
  if (!metaSlugs.has(slug)) {
    throw new Error(`FILTERS: "${slug}" has no entry in collections.json`);
  }
}

export const COLLECTIONS: Record<string, LensCollection> = Object.fromEntries(
  parsed.map((c) => [c.slug, c]),
);

export const PRIME_SLUGS: CollectionSlug[] = ["23mm", "35mm", "50mm", "56mm", "85mm", "wide-angle-primes"];
export const ZOOM_SLUGS: CollectionSlug[] = ["wide-zoom", "standard-zoom", "travel-zoom", "tele-zoom"];
export const BRAND_SLUGS: CollectionSlug[] = ["fujifilm", "7artisans", "viltrox", "ttartisan", "sigma", "brightinstar", "voigtlander", "laowa", "tamron", "sgimage"];
export const SERIES_SLUGS: CollectionSlug[] = ["fujifilm-xf", "fujifilm-xc", "sigma-contemporary", "viltrox-air", "viltrox-pro", "voigtlander-nokton"];
export const PRICE_SLUGS: CollectionSlug[] = ["under-200", "under-400"];
export const PORTABILITY_SLUGS: CollectionSlug[] = ["under-200g", "pancake"];
export const APERTURE_SLUGS: CollectionSlug[] = ["fast-aperture-primes", "constant-aperture"];
export const TRAIT_SLUGS: CollectionSlug[] = ["weather-sealed", "with-ois", "super-tele"];
export const DEDICATED_SLUGS: CollectionSlug[] = ["cine", "fisheye", "tilt-shift", "macro"];
export const CHINESE_SLUGS: CollectionSlug[] = ["chinese-af", "chinese-mf-fast", "chinese-mf-095", "chinese-mf-budget"];

export function getRelatedCollections(
  slug: string,
  allLenses: Lens[],
  locale: string,
  limit = 4,
): LensCollection[] {
  const current = COLLECTIONS[slug];
  if (!current) {
    return [];
  }
  const currentSet = new Set(
    allLenses.filter((l) => current.filter(l, locale)).map((l) => l.id),
  );
  if (currentSet.size === 0) {
    return [];
  }

  const others = Object.values(COLLECTIONS).filter((c) => c.slug !== slug);
  const scored = others.map((c) => {
    let overlap = 0;
    for (const l of allLenses) {
      if (currentSet.has(l.id) && c.filter(l, locale)) {
        overlap++;
      }
    }
    return { collection: c, overlap };
  });

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

export function getCollectionStats(
  slug: string,
  allLenses: Lens[],
  locale: string,
): CollectionStats | null {
  const collection = COLLECTIONS[slug];
  if (!collection) {
    return null;
  }
  const lenses = allLenses.filter((l) =>
    collection.filter(l, locale),
  );
  return {
    collection,
    lenses,
    lensCount: lenses.length,
    brandCount: new Set(lenses.map((l) => l.brand)).size,
  };
}

export interface RelatedCollectionStats {
  collection: LensCollection;
  previewLens: Lens;
  lensCount: number;
  brandCount: number;
}

export function getRelatedCollectionsWithStats(
  slug: string,
  allLenses: Lens[],
  locale: string,
  limit = 4,
): RelatedCollectionStats[] {
  const related = getRelatedCollections(slug, allLenses, locale, limit);
  return related.map((c) => {
    const ls = allLenses.filter((l) => c.filter(l, locale));
    return {
      collection: c,
      previewLens: ls[0],
      lensCount: ls.length,
      brandCount: new Set(ls.map((l) => l.brand)).size,
    };
  });
}

export interface MemberCollectionInfo {
  slug: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
  filter: LensFilter;
  lensCount: number;
}

// Attaches `lensCount` (how many lenses in the whole catalog match this
// collection) to a collection, producing the shape the UI lists need.
function withLensCount(
  collection: LensCollection,
  allLenses: Lens[],
  locale: string,
): MemberCollectionInfo {
  return {
    ...collection,
    lensCount: allLenses.filter((lens) => collection.filter(lens, locale)).length,
  };
}

/**
 * Collections a single lens belongs to — i.e. whose predicate matches the lens.
 * Used on the lens detail page ("this lens appears in …").
 */
export function getMemberCollections(
  lens: Lens,
  allLenses: Lens[],
  locale: string,
): MemberCollectionInfo[] {
  return Object.values(COLLECTIONS)
    .filter((collection) => collection.filter(lens, locale))
    .map((collection) => withLensCount(collection, allLenses, locale));
}

/**
 * Collections shared by ALL of the given lenses — i.e. whose predicate matches
 * every lens. Used on the compare page. Degenerate cases: zero lenses → none;
 * one lens → just that lens's member collections.
 */
export function getSharedCollections(
  lenses: Lens[],
  allLenses: Lens[],
  locale: string,
): MemberCollectionInfo[] {
  if (lenses.length === 0) {
    return [];
  }
  if (lenses.length === 1) {
    return getMemberCollections(lenses[0], allLenses, locale);
  }
  return Object.values(COLLECTIONS)
    .filter((collection) => lenses.every((lens) => collection.filter(lens, locale)))
    .map((collection) => withLensCount(collection, allLenses, locale));
}
