import type { Lens } from "@/lib/types";

/**
 * A themed subset of the lens catalog presented as a standalone landing page.
 * Used for event roundups (e.g. "P&E 2026") and future pSEO topic pages
 * (macro lenses, wide-aperture primes, etc.).
 *
 * Theme pages share the no-filter-UI / no-compare-entry contract from the
 * pSEO plan — they're curated browsing destinations, not interactive
 * exploration surfaces.
 */
export interface LensTheme {
  /** URL slug (latin-only, kebab-case). Shared across locales. */
  slug: string;
  titleZh: string;
  titleEn: string;
  /** Short paragraph rendered under the H1 on the theme page. */
  descriptionZh: string;
  descriptionEn: string;
  /** Predicate against the lens catalog — returns true for lenses in scope. */
  filter: (lens: Lens) => boolean;
}

export const THEMES: Record<string, LensTheme> = {
  "pe-2026": {
    slug: "pe-2026",
    titleZh: "P&E 2026 富士卡口新镜头",
    titleEn: "New X-mount & GFX Lenses at 2026 China P&E",
    descriptionZh:
      "2026 年 5 月 15–18 日北京 P&E 展会上发布的富士 X 卡口（APS-C）和 G 卡口（中画幅）镜头。多数厂商尚未发布完整规格，本页面会随上游数据陆续补全。",
    descriptionEn:
      "X-mount (APS-C) and G-mount (medium format) lenses unveiled by third-party manufacturers at the 2026 China International Photographic Equipment Expo (China P&E, Beijing, May 15–18). Most specs are still pending the manufacturer's official spec sheets; this page will fill in as data lands.",
    filter: (lens) => lens.announcement?.event === "P&E 2026",
  },
};
