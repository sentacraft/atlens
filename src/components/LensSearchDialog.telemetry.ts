"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/analytics";

// Fires a `search` event 500ms after the query stops changing while the
// dialog is open. The trailing-edge debounce ensures we record the user's
// "settled" query (including zero-result ones) without one row per keystroke.
export function useSearchTelemetry({
  query,
  resultsCount,
  isOpen,
}: {
  query: string;
  resultsCount: number;
  isOpen: boolean;
}) {
  useEffect(() => {
    if (!isOpen) {
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
  }, [query, resultsCount, isOpen]);
}
