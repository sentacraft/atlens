import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { getLensImageUrl } from "@/lib/lens/image";

const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
} as const;

// Required on every page that sets openGraph: Next.js replaces the layout's openGraph wholesale.
export function defaultOgImages(): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ ...DEFAULT_OG_IMAGE }];
}

export function lensOgImages(lensId: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ url: getLensImageUrl(lensId), width: 800, height: 800 }];
}

export function buildAlternates(locale: string, localePath: string): Metadata["alternates"] {
  const suffix = localePath ? `/${localePath}` : "";
  const canonical = `${SITE.url}/${locale}${suffix}`;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${SITE.url}/${loc}${suffix}`;
  }
  languages["x-default"] = `${SITE.url}/${routing.defaultLocale}${suffix}`;
  return { canonical, languages };
}
