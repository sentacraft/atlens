"use client";

import { useLocale } from "next-intl";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * Builds mount-aware compare page URLs.
 *
 * Two flavors are returned:
 *
 *   - `buildCompareUrl(ids)` — locale-less path like `/lenses/x/compare?...`,
 *     intended for next-intl's router (which auto-prefixes the locale).
 *
 *   - `buildLocalizedCompareUrl(ids)` — fully prefixed path like
 *     `/en/lenses/x/compare?...`, intended for `window.history.replaceState`
 *     where the path is written verbatim. Without the prefix the address bar
 *     would silently drop `/[locale]` on every in-page mutation.
 *
 * The query string is assembled manually (not via URLSearchParams.toString())
 * to keep commas in the `ids` list unencoded (`A,B` instead of `A%2CB`).
 * Commas are valid query-string characters and the readable form matches
 * what users expect when copying or sharing the URL.
 *
 * `ids` is the URL's single source of truth for compare state. The curated
 * preset that a comparison may match is derived from `ids` (see
 * `findPresetByIds`), not carried as a separate URL param.
 */
export function useCompareUrl() {
  const mount = useEffectiveMount();
  const locale = useLocale();

  function buildQuery(ids: string[]): string {
    return ids.length > 0 ? `ids=${ids.join(",")}` : "";
  }

  function buildCompareUrl(ids: string[]) {
    const seg = mountToUrlSegment(mount);
    const qs = buildQuery(ids);
    return qs ? `/lenses/${seg}/compare?${qs}` : `/lenses/${seg}/compare`;
  }

  function buildLocalizedCompareUrl(ids: string[]) {
    const seg = mountToUrlSegment(mount);
    const qs = buildQuery(ids);
    const path = `/${locale}/lenses/${seg}/compare`;
    return qs ? `${path}?${qs}` : path;
  }

  return { buildCompareUrl, buildLocalizedCompareUrl };
}
