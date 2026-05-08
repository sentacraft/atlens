"use client";

import { useSearchParams } from "next/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * Builds mount-aware compare page URLs while preserving back-navigation context
 * (from / lensId) that was set when the user first entered the compare page.
 */
export function useCompareUrl() {
  const searchParams = useSearchParams();
  const mount = useEffectiveMount();

  function buildCompareUrl(ids: string[], extra?: { preset?: string }) {
    const params = new URLSearchParams();
    if (ids.length > 0) params.set("ids", ids.join(","));
    if (extra?.preset) params.set("preset", extra.preset);

    const from = searchParams.get("from");
    const lensId = searchParams.get("lensId");
    if (from) params.set("from", from);
    if (lensId) params.set("lensId", lensId);

    const seg = mountToUrlSegment(mount);
    const qs = params.toString();
    return qs ? `/lenses/${seg}/compare?${qs}` : `/lenses/${seg}/compare`;
  }

  return { buildCompareUrl };
}
