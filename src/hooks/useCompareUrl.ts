"use client";

import { useSearchParams } from "next/navigation";

/**
 * Builds compare page URLs while preserving back-navigation context
 * (from / lensId) that was set when the user first entered the compare page.
 * This prevents the context from being lost when the user adds lenses,
 * selects presets, or reorders columns within the compare flow.
 */
export function useCompareUrl() {
  const searchParams = useSearchParams();

  function buildCompareUrl(ids: string[], extra?: { preset?: string }) {
    const params = new URLSearchParams();
    if (ids.length > 0) params.set("ids", ids.join(","));
    if (extra?.preset) params.set("preset", extra.preset);

    // Carry forward back-navigation context
    const from = searchParams.get("from");
    const lensId = searchParams.get("lensId");
    if (from) params.set("from", from);
    if (lensId) params.set("lensId", lensId);

    const qs = params.toString();
    return qs ? `/lenses/compare?${qs}` : "/lenses/compare";
  }

  return { buildCompareUrl };
}
