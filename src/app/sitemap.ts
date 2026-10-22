import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";
import { COLLECTIONS } from "@/lib/collections";
import { MOUNTS, mountHasCharts, mountHasCollections } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import xLensesData from "@/data/lenses.json";
import gfxLensesData from "@/data/lenses-gfx.json";
import { buildComparePath } from "@/lib/url/compare";
import { ABOUT_PATH, GET_APP_PATH, RECENTLY_ADDED_PATH, browsePath, chartPath, collectionPath, collectionsPath, lensPath } from "@/lib/url/routes";

const LOCALES = routing.locales;

const LENS_DATA: Record<Mount, { id: string }[]> = {
  X: xLensesData as { id: string }[],
  G: gfxLensesData as { id: string }[],
};

function url(path: string): string {
  return `${SITE.url}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const mountPaths = MOUNTS.flatMap((mount) => {
    const paths = [browsePath(mount), buildComparePath(mount, [])];
    if (mountHasCollections(mount)) {
      paths.push(collectionsPath(mount));
    }
    if (mountHasCharts(mount)) {
      paths.push(chartPath(mount, "timeline"), chartPath(mount, "weight"));
    }
    return paths;
  });
  const staticPaths = [...mountPaths, ABOUT_PATH, RECENTLY_ADDED_PATH, GET_APP_PATH];

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => [
    {
      url: url(`/${locale}`),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...staticPaths.map((path) => ({
      url: url(`/${locale}${path}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]);

  const lensEntries: MetadataRoute.Sitemap = MOUNTS.flatMap((mount) => {
    return LENS_DATA[mount].flatMap((lens) =>
      LOCALES.map((locale) => ({
        url: url(`/${locale}${lensPath({ mount, id: lens.id })}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    );
  });

  const collectionEntries: MetadataRoute.Sitemap = MOUNTS.filter(mountHasCollections).flatMap(
    (mount) => {
      return Object.keys(COLLECTIONS).flatMap((slug) =>
        LOCALES.map((locale) => ({
          url: url(`/${locale}${collectionPath(mount, slug)}`),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }))
      );
    }
  );

  return [...staticEntries, ...collectionEntries, ...lensEntries];
}
