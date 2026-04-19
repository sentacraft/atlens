import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";
import lenses from "@/data/lenses.json";

const LOCALES = routing.locales;

function url(path: string): string {
  return `${SITE.url}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["/lenses", "/lenses/compare", "/about", "/get"];

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => [
    // Home
    {
      url: url(`/${locale}`),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Other static pages
    ...staticPaths.map((path) => ({
      url: url(`/${locale}${path}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]);

  const lensEntries: MetadataRoute.Sitemap = (lenses as { id: string }[]).flatMap(
    (lens) =>
      LOCALES.map((locale) => ({
        url: url(`/${locale}/lenses/${lens.id}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
  );

  return [...staticEntries, ...lensEntries];
}
