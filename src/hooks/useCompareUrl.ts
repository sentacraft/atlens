"use client";

import { useSearchParams } from "next/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * Builds mount-aware compare page URLs while preserving back-navigation context
 * (from / lensId) that was set when the user first entered the compare page.
 *
 * The query string is assembled manually rather than via URLSearchParams.toString()
 * to keep commas in the `ids` list unencoded (`A,B` instead of `A%2CB`). Commas
 * are valid query-string characters and the readable form matches what users
 * expect when copying the URL or sharing it.
 */
export function useCompareUrl() {
  const searchParams = useSearchParams();
  const mount = useEffectiveMount();

  function buildCompareUrl(ids: string[], extra?: { preset?: string }) {
    const parts: string[] = [];
    if (ids.length > 0) parts.push(`ids=${ids.join(",")}`);
    if (extra?.preset) parts.push(`preset=${encodeURIComponent(extra.preset)}`);

    const from = searchParams.get("from");
    const lensId = searchParams.get("lensId");
    if (from) parts.push(`from=${encodeURIComponent(from)}`);
    if (lensId) parts.push(`lensId=${encodeURIComponent(lensId)}`);

    const seg = mountToUrlSegment(mount);
    const qs = parts.join("&");
    return qs ? `/lenses/${seg}/compare?${qs}` : `/lenses/${seg}/compare`;
  }

  return { buildCompareUrl };
}
