"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { changedFilters, type FilterState } from "@/lib/lens/lens";
import { track } from "@/lib/analytics/analytics";

// Compares with the last recorded filters instead of skipping the first render: Strict Mode runs
// the effect twice on mount, and a skip-once ref then recorded a phantom filter_reset.
export function useFiltersTelemetry(filters: FilterState) {
  const changed = changedFilters(filters);
  const key = JSON.stringify({ ...changed, sort: undefined, sortDir: undefined });
  const recordedRef = useRef(key);

  const record = useEffectEvent(() => {
    recordedRef.current = key;
    if (key === "{}") {
      track("filter_reset");
    } else {
      track("filter_apply", { filters_json: JSON.stringify(changed) });
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
