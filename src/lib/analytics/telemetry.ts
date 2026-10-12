// Transport for client telemetry. Events are sent to /api/telemetry; the Worker tags
// each with CF-IPCountry and CF-Ray (PoP) before logging. Identical events within the
// dedupe window are dropped to keep volume sane.

const ENDPOINT = "/api/telemetry";
const DEDUPE_WINDOW_MS = 30_000;

const recentlySent = new Map<string, number>();

export function reportTelemetry(payload: Record<string, unknown>): void {
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
