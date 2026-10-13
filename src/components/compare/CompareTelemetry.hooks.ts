"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/analytics";

export function useCompareViewTelemetry(lensIds: string[]) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || lensIds.length === 0) {
      return;
    }
    firedRef.current = true;
    track("compare_view", {
      lens_slugs: lensIds.join(","),
      lens_count: lensIds.length,
    });
  }, [lensIds]);
}

export function useCompareScrollTelemetry(lensIds: string[]) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (lensIds.length === 0) {
      return;
    }
    function onScroll() {
      if (firedRef.current) {
        return;
      }
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        return;
      }
      const ratio = window.scrollY / scrollable;
      if (ratio >= 0.8) {
        firedRef.current = true;
        track("compare_scroll", { lens_slugs: lensIds.join(",") });
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lensIds]);
}
