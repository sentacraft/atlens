"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/analytics";

const SCROLL_MILESTONES = [50, 90] as const;

export function useLensViewTelemetry(lensSlug: string) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) {
      return;
    }
    firedRef.current = true;
    track("lens_view", {
      lens_slug: lensSlug,
      referrer: typeof document !== "undefined" ? document.referrer.slice(0, 256) : undefined,
    });
  }, [lensSlug]);
}

export function useLensScrollTelemetry(lensSlug: string) {
  const firedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        return;
      }
      const pct = Math.floor((window.scrollY / scrollable) * 100);
      for (const milestone of SCROLL_MILESTONES) {
        if (pct >= milestone && !firedRef.current.has(milestone)) {
          firedRef.current.add(milestone);
          track("lens_scroll", { lens_slug: lensSlug, depth_pct: milestone });
        }
      }
      if (firedRef.current.size === SCROLL_MILESTONES.length) {
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lensSlug]);
}
