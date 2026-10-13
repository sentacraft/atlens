"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/analytics";

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
