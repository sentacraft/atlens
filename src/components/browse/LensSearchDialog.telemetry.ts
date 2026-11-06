"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/analytics";

interface PendingSearch {
  query: string;
  resultsCount: number;
}

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
  const pending = useRef<PendingSearch | null>(null);

  useEffect(() => {
    if (!isOpen || isComposing) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      pending.current = null;
      return;
    }
    pending.current = { query: trimmed, resultsCount };
    const timer = setTimeout(() => {
      pending.current = null;
      track("search", { query: trimmed, results_count: resultsCount });
    }, 500);
    return () => clearTimeout(timer);
  }, [query, resultsCount, isOpen, isComposing]);

  // Picking a result closes the dialog inside the debounce window; without this the final query is lost.
  useEffect(() => {
    if (isOpen || !pending.current) {
      return;
    }
    const { query: last, resultsCount: count } = pending.current;
    pending.current = null;
    track("search", { query: last, results_count: count });
  }, [isOpen]);
}

/** Records which result was picked, with its 1-based position in the list. */
export function trackSearchSelect({ query, lensId, rank }: { query: string; lensId: string; rank: number }) {
  track("search_select", { query: query.trim(), lens_id: lensId, rank });
}
