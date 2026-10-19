"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/analytics";

export function useSearchTelemetry({
  query,
  resultsCount,
  isOpen,
  isComposing,
}: {
  query: string;
  resultsCount: number;
  isOpen: boolean;
  isComposing: boolean;
}) {
  useEffect(() => {
    if (!isOpen || isComposing) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      track("search", { query: trimmed, results_count: resultsCount });
    }, 500);
    return () => clearTimeout(timer);
  }, [query, resultsCount, isOpen, isComposing]);
}

/** Records which result was picked, with its 1-based position in the list. */
export function trackSearchSelect({ query, lensId, rank }: { query: string; lensId: string; rank: number }) {
  track("search_select", { query: query.trim(), lens_id: lensId, rank });
}
