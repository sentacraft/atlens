import brandsData from "@/data/brands.json";
import type { Lens } from "@/lib/types";

/** A brand's own page: every photo lens it makes for the mount, with hand-written copy. */
export interface BrandInfo {
  slug: string;
  description: { en: string; zh: string };
  shortDescription: { en: string; zh: string };
}

export const BRANDS: BrandInfo[] = Object.entries(brandsData).map(([slug, copy]) => ({ slug, ...copy }));

export function getBrandInfo(slug: string): BrandInfo | undefined {
  return BRANDS.find((brand) => brand.slug === slug);
}

/** The lenses a brand page lists: the same photo lenses the charts use, cine lenses left out. */
export function getBrandLenses(lenses: Lens[], brand: string): Lens[] {
  return lenses.filter((lens) => lens.brand === brand && !lens.isCine);
}
