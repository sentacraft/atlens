"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * Builds mount-aware compare page URLs while preserving back-navigation context
 * (from / lensId) that was set when the user first entered the compare page.
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
 */
export function useCompareUrl() {
  const searchParams = useSearchParams();
  const mount = useEffectiveMount();
  const locale = useLocale();

  function buildQuery(ids: string[], extra?: { preset?: string }): string {
    const parts: string[] = [];
    if (ids.length > 0) {
      parts.push(`ids=${ids.join(",")}`);
    }
    if (extra?.preset) {
      parts.push(`preset=${encodeURIComponent(extra.preset)}`);
    }

    const from = searchParams.get("from");
    const lensId = searchParams.get("lensId");
    if (from) {
      parts.push(`from=${encodeURIComponent(from)}`);
    }
    if (lensId) {
      parts.push(`lensId=${encodeURIComponent(lensId)}`);
    }

    return parts.join("&");
  }

  function buildCompareUrl(ids: string[], extra?: { preset?: string }) {
    const seg = mountToUrlSegment(mount);
    const qs = buildQuery(ids, extra);
    return qs ? `/lenses/${seg}/compare?${qs}` : `/lenses/${seg}/compare`;
  }

  function buildLocalizedCompareUrl(
    ids: string[],
    extra?: { preset?: string }
  ) {
    const seg = mountToUrlSegment(mount);
    const qs = buildQuery(ids, extra);
    const path = `/${locale}/lenses/${seg}/compare`;
    return qs ? `${path}?${qs}` : path;
  }

  return { buildCompareUrl, buildLocalizedCompareUrl };
}
