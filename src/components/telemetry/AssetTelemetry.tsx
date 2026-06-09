"use client";

import { useEffect } from "react";

// Client-side telemetry: reports two classes of problem that the Cloudflare
// Workers ASSETS pipeline and Cloudflare Web Analytics do not surface:
//   1. asset-error  — `<img>/<script>/<link>` load failures (404, network reset)
//   2. slow-asset   — successful but >3s loads (the dominant trans-Pacific mode)
//
// Page-level Core Web Vitals (LCP/INP/CLS) are intentionally NOT reported
// here — Cloudflare Web Analytics' auto-injected beacon already collects them
// with country breakdowns, on all plans. Adding `web-vitals` would duplicate
// that with worse aggregation.
//
// Events are sent to /api/telemetry; the Worker tags each with CF-IPCountry
// and CF-Ray (PoP) before logging. Dedupe to keep volume sane.

const ENDPOINT = "/api/telemetry";
const DEDUPE_WINDOW_MS = 30_000;
const ASSET_TAGS = new Set(["IMG", "SCRIPT", "LINK"]);
const SLOW_ASSET_THRESHOLD_MS = 3000;
const SLOW_ASSET_KINDS = new Set(["img", "script", "link", "css"]);

const recentlySent = new Map<string, number>();

function send(payload: Record<string, unknown>): void {
  const key = JSON.stringify(payload);
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) {
    return;
  }
  recentlySent.set(key, now);
  try {
    const body = JSON.stringify({ ...payload, ts: now, page: location.pathname });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(ENDPOINT, body);
    } else {
      fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Telemetry must never throw into the host page.
  }
}

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
      send({
        evt: "asset-error",
        tag: target.tagName,
        url,
        conn: (navigator as Navigator & { connection?: { effectiveType?: string } })
          .connection?.effectiveType,
      });
    }
    // Capture phase = true: <img>/<script>/<link> error events don't bubble.
    window.addEventListener("error", onAssetError, true);

    // Slow-but-successful resources are invisible to the 'error' listener.
    // Resource Timing surfaces per-resource durations, so we can flag
    // stragglers that load but take painfully long — the dominant failure
    // mode for users on congested trans-Pacific links.
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
            send({
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
        // buffered: also receive entries that completed before observe() ran,
        // which catches the initial-page-load burst.
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
