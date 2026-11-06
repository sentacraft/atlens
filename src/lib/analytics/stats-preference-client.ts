import { STATS_OPT_OUT_COOKIE } from "@/lib/analytics/session";
import type { StatsPreference } from "@/lib/analytics/stats-preference";

/** Whether this device is counted; true unless the opt-out cookie is set. */
export function readStatsEnabled(): boolean {
  return !document.cookie.split(";").some((part) => part.trim() === `${STATS_OPT_OUT_COOKIE}=1`);
}

export async function saveStatsPreference(payload: StatsPreference): Promise<void> {
  const res = await fetch("/api/stats-preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("request_failed");
  }
}
