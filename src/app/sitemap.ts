import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";
import xLensesData from "@/data/lenses.json";
import gfxLensesData from "@/data/lenses-gfx.json";

const LOCALES = routing.locales;

function url(path: string): string {
  return `${SITE.url}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "/lenses",
    "/lenses/x",
    "/lenses/x/compare",
    "/lenses/gfx",
    "/lenses/gfx/compare",
    "/lenses/pe-2026",
    "/about",
    "/get",
  ];

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

  // Placeholder lenses (status === "placeholder") have no detail page —
  // their slugs 404 by design — so they must be excluded from the sitemap
  // to avoid feeding soft-404 URLs to crawlers.
  const xLensEntries: MetadataRoute.Sitemap = (xLensesData as { id: string; status?: string }[])
    .filter((lens) => lens.status !== "placeholder")
    .flatMap((lens) =>
      LOCALES.map((locale) => ({
        url: url(`/${locale}/lenses/x/${lens.id}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    );

  const gfxLensEntries: MetadataRoute.Sitemap = (gfxLensesData as { id: string; status?: string }[])
    .filter((lens) => lens.status !== "placeholder")
    .flatMap((lens) =>
      LOCALES.map((locale) => ({
        url: url(`/${locale}/lenses/gfx/${lens.id}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    );

  return [...staticEntries, ...xLensEntries, ...gfxLensEntries];
}
