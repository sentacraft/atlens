import type { TelemetryPayload, TelemetryReport } from "@/lib/analytics/telemetry-contract";

const ENDPOINT = "/api/telemetry";
const DEDUPE_WINDOW_MS = 30_000;

const recentlySent = new Map<string, number>();

export function reportTelemetry(payload: TelemetryReport): void {
  const key = JSON.stringify(payload);
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) {
    return;
  }
  recentlySent.set(key, now);
  try {
    const full: TelemetryPayload = { ...payload, ts: now, page: location.pathname };
    const body = JSON.stringify(full);
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(ENDPOINT, body);
    } else {
      fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
  }
}
