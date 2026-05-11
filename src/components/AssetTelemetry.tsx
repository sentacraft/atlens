"use client";

import { useEffect } from "react";
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";

// Client-side telemetry: reports asset load failures and Web Vitals to
// /api/telemetry. The Worker logs each event with CF-IPCountry and CF-Ray
// (which embeds the serving PoP), giving us geo-attributed visibility into
// problems that bypass the Worker — most notably static assets served via
// the ASSETS binding, which produce no Worker logs of their own.
//
// Dedupe and sample to keep log volume sane; we expect O(10) events per
// session at most. Worker observability is enabled in wrangler.toml.

const ENDPOINT = "/api/telemetry";
const DEDUPE_WINDOW_MS = 30_000;
const ASSET_TAGS = new Set(["IMG", "SCRIPT", "LINK"]);

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

    const report = (m: Metric) => {
      // Skip "good" measurements to keep volume down; only report degraded
      // experience. Tune later if we want full RUM histograms.
      if (m.rating === "good") {
        return;
      }
      send({ evt: "vitals", name: m.name, value: Math.round(m.value), rating: m.rating });
    };
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);

    return () => window.removeEventListener("error", onAssetError, true);
  }, []);

  return null;
}
