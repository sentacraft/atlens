import "server-only";
import { FILTERS, type CollectionSlug } from "@/lib/collection-filters";
import { COLLECTIONS, type LensCollection } from "@/lib/collections";
import { getAllLenses } from "@/lib/lens/data";
import { routing } from "@/i18n/routing";
import type { Lens } from "@/lib/types";

// The half of collections that needs the catalogue: which lenses are in a collection,
// and the counts derived from that. It is separate from collections.ts because that one
// is imported by a client component, and a module reaching for getAllLenses drags 477KB
// of JSON into whatever bundle names it — the `server-only` import above turns that into
// a build error rather than a silent payload.

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

// Internal: related collections by member overlap. Only the *WithStats wrapper
// below consumes it, so it stays private.
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

// Internal: members + derived counts for a collection, from the precomputed
// members. Single place that builds the stat numbers (shared by the two
// exported stats functions below).
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

// slug -> member count, for every collection. The one projection of membership small
// enough to hand to a client component: 43 collections, ~683 bytes, against the 267KB
// of catalogue a client would otherwise need to count them itself.
export function getCollectionLensCounts(locale: string): Record<string, number> {
  return Object.fromEntries(
    Object.keys(COLLECTIONS).map((slug) => [slug, membersOf(slug, locale).length]),
  );
}

export function getRelatedCollectionsWithStats(
  slug: string,
  locale: string,
  limit = 4,
): RelatedCollectionStats[] {
  return getRelatedCollections(slug, locale, limit).map((collection) => {
    const { lenses, lensCount, brandCount } = statsFor(collection, locale);
    return { collection, previewLens: lenses[0], lensCount, brandCount };
  });
}
