import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { getLensImageUrl } from "@/lib/lens/image";

// Default OG image is the site-wide 1200x630 PNG used for the home page and
// every page that doesn't have a more specific image to advertise.
const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
} as const;

/**
 * OG image slot for pages that don't have page-specific imagery. Use this in
 * every non-home generateMetadata's openGraph spread — Next.js does a wholesale
 * replace on openGraph when a page sets its own, so the layout-level images
 * inheritance is lost without this re-declaration.
 */
export function defaultOgImages(): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ ...DEFAULT_OG_IMAGE }];
}

/**
 * OG image slot for lens detail pages. Uses the lens's own square 800x800
 * webp. Social platforms render this as a square thumbnail (Twitter "summary"
 * card style) which fits a single-product context better than the 1200x630
 * site banner.
 */
export function lensOgImages(lensId: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ url: getLensImageUrl(lensId), width: 800, height: 800 }];
}

/**
 * Builds canonical + hreflang alternates for a given locale + path.
 * localePath is the part after the locale segment, e.g. "", "lenses", "lenses/compare", "lenses/xf-18mm-f2"
 */
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
