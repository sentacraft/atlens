"use client";

import type { EventName, EventProps, TrackPayload } from "@/lib/analytics/events";

const ENDPOINT = "/api/track";

let signedIn = false;

/** Kept in step with the auth session by AnalyticsSessionSync; events record it as signed_in. */
export function setAnalyticsSignedIn(value: boolean): void {
  signedIn = value;
}

export function track<E extends EventName>(event: E, props?: EventProps<E>): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: TrackPayload = {
    event,
    locale: document.documentElement.lang || undefined,
    path: window.location.pathname,
    signed_in: signedIn,
    props,
  };
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
  }
}
