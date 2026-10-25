"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { defaultFilters, type FilterState } from "@/lib/lens/lens";
import { track } from "@/lib/analytics/analytics";

// Compares with the last recorded filters instead of skipping the first render: Strict Mode runs
// the effect twice on mount, and a skip-once ref then recorded a phantom filter_reset.
export function useFiltersTelemetry(filters: FilterState) {
  const key = JSON.stringify({ ...filters, sort: undefined, sortDir: undefined });
  const recordedRef = useRef(key);

  const record = useEffectEvent(() => {
    recordedRef.current = key;
    const isEmpty =
      filters.brands.length === 0 &&
      filters.focalCategories.length === 0 &&
      filters.features.length === 0 &&
      filters.typeFilter === null &&
      filters.focusFilter === null &&
      filters.usage === defaultFilters.usage &&
      filters.opticalTrait === null &&
      filters.focusMotorClass === null;
    if (isEmpty) {
      track("filter_reset");
    } else {
      track("filter_apply", { filters_json: JSON.stringify(filters) });
    }
  });

  useEffect(() => {
    if (key === recordedRef.current) {
      return;
    }
    const timer = setTimeout(record, 1000);
    return () => clearTimeout(timer);
  }, [key]);
}
