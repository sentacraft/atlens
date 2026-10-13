"use client";

import { useEffect, useRef } from "react";
import { defaultFilters, type FilterState } from "@/lib/lens/lens";
import { track } from "@/lib/analytics/analytics";

// Skips the initial mount, which would emit a phantom filter_reset.
export function useFiltersTelemetry(filters: FilterState) {
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const isEmpty =
      filters.brands.length === 0 &&
      filters.focalCategories.length === 0 &&
      filters.features.length === 0 &&
      filters.typeFilter === null &&
      filters.focusFilter === null &&
      filters.usage === defaultFilters.usage &&
      filters.opticalTrait === null &&
      filters.focusMotorClass === null;
    const timer = setTimeout(() => {
      if (isEmpty) {
        track("filter_reset");
      } else {
        track("filter_apply", { filters_json: JSON.stringify(filters) });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [filters]);
}
