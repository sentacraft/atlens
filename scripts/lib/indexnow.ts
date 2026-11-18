import { isDeepStrictEqual } from "node:util";
import { routing } from "@/i18n/routing";
import { MOUNTS, mountHasCollections } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import { buildComparePath } from "@/lib/url/compare";
import { ABOUT_PATH, GET_APP_PATH, RECENTLY_ADDED_PATH, brandPath, browsePath, collectionPath, collectionsPath, lensPath } from "@/lib/url/routes";

export type CatalogSource = { repository: string; commit: string };
type CatalogLens = { id: string; brand: string; [field: string]: unknown };
export type SiteSnapshot = {
  lenses: Record<Mount, CatalogLens[]>;
  brands: Record<string, unknown>;
  collections: { slug: string }[];
  messages: Partial<Record<(typeof routing.locales)[number], Record<string, Record<string, unknown>>>>;
};

type PageDelta = { live: string[]; removed: string[] };

function changedEntries<T>(before: Map<string, T>, after: Map<string, T>, visit: (id: string, old: T | undefined, current: T | undefined) => void) {
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(id);
    const current = after.get(id);
    if (!isDeepStrictEqual(old, current)) {visit(id, old, current);}
  }
}

type Locale = (typeof routing.locales)[number];

function metadataChanged(before: SiteSnapshot, after: SiteSnapshot, locale: Locale, namespace: string, pattern: RegExp) {
  const select = (snapshot: SiteSnapshot) => Object.fromEntries(
    Object.entries(snapshot.messages[locale]?.[namespace] ?? {}).filter(([key]) => pattern.test(key)),
  );
  return !isDeepStrictEqual(select(before), select(after));
}

export function lensMetadataChanged(before: SiteSnapshot, after: SiteSnapshot, locale: Locale) {
  return metadataChanged(before, after, locale, "LensDetail", /^meta/);
}

export function changedPages(before: SiteSnapshot, after: SiteSnapshot): PageDelta {
  const live = new Set<string>();
  const removed = new Set<string>();
  const add = (path: string, exists = true) => {
    for (const locale of routing.locales) {(exists ? live : removed).add(`/${locale}${path}`);}
  };

  for (const mount of MOUNTS) {
    const lensMap = (snapshot: SiteSnapshot) => new Map(snapshot.lenses[mount].map((lens) => [lens.id, lens]));
    changedEntries(lensMap(before), lensMap(after), (id, old, current) => {
      add(lensPath({ mount, id }), Boolean(current));
      add(browsePath(mount));
      if (!old || !current) {add(RECENTLY_ADDED_PATH);}
      if (mountHasCollections(mount)) {
        for (const brand of [old?.brand, current?.brand]) {
          if (brand && Object.hasOwn(after.brands, brand)) {add(brandPath(mount, brand));}
        }
      }
    });

    if (mountHasCollections(mount)) {
      changedEntries(new Map(Object.entries(before.brands)), new Map(Object.entries(after.brands)), (slug, _old, current) => {
        add(brandPath(mount, slug), current !== undefined);
        add(collectionsPath(mount));
      });
      const collectionMap = (snapshot: SiteSnapshot) => new Map(snapshot.collections.map((collection) => [collection.slug, collection]));
      changedEntries(collectionMap(before), collectionMap(after), (slug, _old, current) => {
        add(collectionPath(mount, slug), Boolean(current));
        add(collectionsPath(mount));
      });
    }
  }

  for (const locale of routing.locales) {
    const metaChanged = (namespace: string, pattern: RegExp) => metadataChanged(before, after, locale, namespace, pattern);
    const mark = (path: string) => live.add(`/${locale}${path}`);
    if (metaChanged("Metadata", /^seo(?:Title|Description)$/)) {mark("");}
    if (metaChanged("About", /^metaDescription$/)) {mark(ABOUT_PATH);}
    if (metaChanged("Install", /^metaDescription$/)) {mark(GET_APP_PATH);}
    if (metaChanged("RecentlyAdded", /^metaDescription$/)) {mark(RECENTLY_ADDED_PATH);}
    for (const mount of MOUNTS) {
      if (metaChanged("LensList", new RegExp(`^meta(?:Title|Desc)${mount}$`))) {mark(browsePath(mount));}
      if (metaChanged("Compare", new RegExp(`^meta(?:Title|Desc)${mount}$`))) {mark(buildComparePath(mount, []));}
      if (metaChanged("LensDetail", /^meta/)) {
        for (const lens of after.lenses[mount]) {mark(lensPath({ mount, id: lens.id }));}
      }
      if (mountHasCollections(mount)) {
        if (metaChanged("Collection", /^meta/)) {
          for (const { slug } of after.collections) {mark(collectionPath(mount, slug));}
        }
        if (metaChanged("Brand", /^meta/)) {
          for (const slug of Object.keys(after.brands)) {mark(brandPath(mount, slug));}
        }
      }
    }
  }

  return { live: [...live].sort(), removed: [...removed].sort() };
}

export function submissionUrls(base: string, sitemap: string, { live, removed }: PageDelta): string[] {
  const known = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim()));
  if (!known.size) {throw new Error("Production sitemap lists no URLs");}
  return [...new Set([
    ...live.map((path) => `${base}${path}`).filter((url) => known.has(url)),
    ...removed.map((path) => `${base}${path}`).filter((url) => !known.has(url)),
  ])];
}

export async function deployedRange(
  revisions: string[],
  deployed: (revision: string) => Promise<boolean>,
  expected?: string,
): Promise<{ before: string; after: string }> {
  if (expected && !revisions.includes(expected)) {
    throw new Error("The reported deployment is not in recent main history");
  }
  const candidates = expected ? revisions.slice(revisions.indexOf(expected)) : revisions;
  let after: string | undefined;
  for (const revision of candidates) {
    if (!(await deployed(revision))) {continue;}
    if (after) {return { before: revision, after };}
    if (expected && revision !== expected) {throw new Error("The reported deployment is not confirmed successful");}
    after = revision;
  }
  throw new Error("Cannot find two successful production deployments in recent main history");
}
