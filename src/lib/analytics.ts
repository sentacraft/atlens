"use client";

import type { EventName, EventProps, TrackPayload } from "./analytics-events";

const ENDPOINT = "/api/track";

// Fire-and-forget analytics. Never throws, never blocks, never logs to the
// console. Failures are silent on purpose — if the beacon doesn't make it,
// the user shouldn't see a console error or a failed network request.
export function track(event: EventName, props?: EventProps): void {
  if (typeof window === "undefined") {
    return;
  }

  const locale = document.documentElement.lang || undefined;
  const payload: TrackPayload = {
    event,
    locale,
    props: {
      ...props,
      path: props?.path ?? window.location.pathname,
    },
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
    // Analytics must never break the page.
  }
}
