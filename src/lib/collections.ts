import type { Lens } from "@/lib/types";

/**
 * A curated subset of the lens catalog presented as a standalone landing
 * page. Used for pSEO topic pages (macro lenses, wide-aperture primes,
 * etc.) and any future event roundups.
 *
 * Collection pages share the no-filter-UI / no-compare-entry contract
 * from the pSEO plan — they're curated browsing destinations, not
 * interactive exploration surfaces.
 *
 * The registry below is intentionally empty for now: the infra
 * (route, components, layout, i18n shape) lands first; specific
 * collections get added in follow-up PRs as the underlying data is
 * ready for them.
 */
export interface LensCollection {
  /** URL slug (latin-only, kebab-case). Shared across locales. */
  slug: string;
  titleZh: string;
  titleEn: string;
  /** Short paragraph rendered under the H1 on the collection page. */
  descriptionZh: string;
  descriptionEn: string;
  /** Predicate against the lens catalog — returns true for lenses in scope. */
  filter: (lens: Lens) => boolean;
}

export const COLLECTIONS: Record<string, LensCollection> = {};
