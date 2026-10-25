"use client";

import { matchesBreakpoint } from "@/lib/breakpoints";
import type { EventName, EventProps, TrackPayload } from "@/lib/analytics/events";

const ENDPOINT = "/api/track";

export function track<E extends EventName>(event: E, props?: EventProps<E>): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: TrackPayload = {
    event,
    locale: document.documentElement.lang || undefined,
    path: window.location.pathname,
    props: { ...props, viewport: viewport() },
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

function viewport(): "phone" | "tablet" | "desktop" {
  if (matchesBreakpoint("lg")) {
    return "desktop";
  }
  return matchesBreakpoint("sm") ? "tablet" : "phone";
}
