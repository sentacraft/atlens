import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";
import { BRANDS, getBrandLenses } from "@/lib/brands";
import { COLLECTIONS } from "@/lib/collections";
import { getAllLenses, getLensesByMount } from "@/lib/lens/data";
import { MOUNTS, mountHasCharts, mountHasCollections } from "@/lib/mount";
import type { Lens } from "@/lib/types";
import { buildComparePath } from "@/lib/url/compare";
import { ABOUT_PATH, GET_APP_PATH, RECENTLY_ADDED_PATH, brandPath, browsePath, chartPath, collectionPath, collectionsPath, lensPath } from "@/lib/url/routes";

const LOCALES = routing.locales;
const DATA_LOCALE = routing.defaultLocale;

function url(path: string): string {
  return `${SITE.url}${path}`;
}

function latest(dates: (string | undefined)[]): string | undefined {
  return dates.filter((d): d is string => Boolean(d)).sort().at(-1);
}

function lastChanged(lenses: Lens[]): string | undefined {
  return latest(lenses.flatMap((l) => [l.createdAt, l.updatedAt]));
}

function lastAdded(lenses: Lens[]): string | undefined {
  return latest(lenses.map((l) => l.createdAt));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const allLenses = getAllLenses(DATA_LOCALE);
  const newest = lastAdded(allLenses);

  const pages: { path: string; lastModified?: string }[] = [
    { path: "", lastModified: newest },
    { path: RECENTLY_ADDED_PATH, lastModified: newest },
    { path: ABOUT_PATH },
    { path: GET_APP_PATH },
  ];

  for (const mount of MOUNTS) {
    const lenses = getLensesByMount(mount, DATA_LOCALE);
    const photoLenses = lenses.filter((l) => !l.isCine);
    const mountChanged = lastChanged(lenses);
    pages.push({ path: browsePath(mount), lastModified: mountChanged }, { path: buildComparePath(mount, []) });
    if (mountHasCollections(mount)) {
      pages.push({ path: collectionsPath(mount), lastModified: mountChanged });
      for (const { slug } of BRANDS) {
        pages.push({ path: brandPath(mount, slug), lastModified: lastChanged(getBrandLenses(lenses, slug)) });
      }
      for (const collection of Object.values(COLLECTIONS)) {
        const members = lenses.filter((l) => collection.filter(l, DATA_LOCALE));
        pages.push({ path: collectionPath(mount, collection.slug), lastModified: lastChanged(members) });
      }
    }
    if (mountHasCharts(mount)) {
      const chartsChanged = lastChanged(photoLenses);
      for (const chart of ["timeline", "weight", "lineups"] as const) {
        pages.push({ path: chartPath(mount, chart), lastModified: chartsChanged });
      }
    }
    for (const lens of lenses) {
      pages.push({ path: lensPath(lens), lastModified: lastChanged([lens]) });
    }
  }

  return pages.flatMap(({ path, lastModified }) =>
    LOCALES.map((locale) => ({
      url: url(`/${locale}${path}`),
      ...(lastModified && { lastModified }),
    })),
  );
}
