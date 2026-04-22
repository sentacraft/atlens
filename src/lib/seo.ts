import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";

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
