"use client";

import { useEffect, useRef } from "react";
import type { FilterState } from "@/lib/lens";
import { track } from "@/lib/analytics";

// Fires `filter_apply` (with a snapshot of active filters) or `filter_reset`
// 1s after the user stops adjusting filters. Skips the initial mount so we
// don't emit a phantom `filter_reset` on every page load.
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
      filters.usage === "photo" &&
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
