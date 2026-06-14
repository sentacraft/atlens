import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";
import { COLLECTIONS } from "@/lib/collections";
import { MOUNTS, mountToUrlSegment, mountHasCollections } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import xLensesData from "@/data/lenses.json";
import gfxLensesData from "@/data/lenses-gfx.json";

const LOCALES = routing.locales;

// Lens catalogs keyed by mount, so the per-mount loops below stay data-driven
// rather than hardcoding one branch per mount.
const LENS_DATA: Record<Mount, { id: string }[]> = {
  X: xLensesData as { id: string }[],
  G: gfxLensesData as { id: string }[],
};

function url(path: string): string {
  return `${SITE.url}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Per-mount index paths: browse + compare always, collections only where the
  // mount actually has them (gated by the same flag as the routes/tab).
  const mountPaths = MOUNTS.flatMap((mount) => {
    const seg = mountToUrlSegment(mount);
    const paths = [`/lenses/${seg}/browse`, `/lenses/${seg}/compare`];
    if (mountHasCollections(mount)) {
      paths.push(`/lenses/${seg}/collections`);
    }
    return paths;
  });
  const staticPaths = [...mountPaths, "/about", "/recently-added", "/get"];

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
    const seg = mountToUrlSegment(mount);
    return LENS_DATA[mount].flatMap((lens) =>
      LOCALES.map((locale) => ({
        url: url(`/${locale}/lenses/${seg}/${lens.id}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    );
  });

  const collectionEntries: MetadataRoute.Sitemap = MOUNTS.filter(mountHasCollections).flatMap(
    (mount) => {
      const seg = mountToUrlSegment(mount);
      return Object.keys(COLLECTIONS).flatMap((slug) =>
        LOCALES.map((locale) => ({
          url: url(`/${locale}/lenses/${seg}/collections/${slug}`),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }))
      );
    }
  );

  return [...staticEntries, ...collectionEntries, ...lensEntries];
}
