"use client";

import { useEffect } from "react";
import { reportTelemetry } from "@/lib/analytics/telemetry";

// No Core Web Vitals: Cloudflare Web Analytics already collects them.

const ASSET_TAGS = new Set(["IMG", "SCRIPT", "LINK"]);
const SLOW_ASSET_THRESHOLD_MS = 3000;
const SLOW_ASSET_KINDS = new Set(["img", "script", "link", "css"]);

export default function AssetTelemetry() {
  useEffect(() => {
    function onAssetError(e: Event) {
      const target = e.target as (HTMLElement & { src?: string; href?: string }) | null;
      if (!target || !ASSET_TAGS.has(target.tagName)) {
        return;
      }
      const url = target.src || target.href;
      if (!url) {
        return;
      }
      reportTelemetry({
        evt: "asset-error",
        tag: target.tagName,
        url,
        conn: (navigator as Navigator & { connection?: { effectiveType?: string } })
          .connection?.effectiveType,
      });
    }
    // Capture phase: asset error events do not bubble.
    window.addEventListener("error", onAssetError, true);

    let resourceObs: PerformanceObserver | null = null;
    if (typeof PerformanceObserver === "function") {
      try {
        resourceObs = new PerformanceObserver((list) => {
          for (const e of list.getEntries() as PerformanceResourceTiming[]) {
            if (!SLOW_ASSET_KINDS.has(e.initiatorType)) {
              continue;
            }
            if (e.duration < SLOW_ASSET_THRESHOLD_MS) {
              continue;
            }
            reportTelemetry({
              evt: "slow-asset",
              kind: e.initiatorType,
              url: e.name,
              duration: Math.round(e.duration),
              ttfb: Math.round(e.responseStart - e.requestStart),
              transfer: e.transferSize,
              encoded: e.encodedBodySize,
            });
          }
        });
        resourceObs.observe({ type: "resource", buffered: true });
      } catch {
        resourceObs = null;
      }
    }

    return () => {
      window.removeEventListener("error", onAssetError, true);
      resourceObs?.disconnect();
    };
  }, []);

  return null;
}
