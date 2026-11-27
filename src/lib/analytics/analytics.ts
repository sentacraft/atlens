"use client";

import { matchesBreakpoint } from "@/lib/breakpoints";
import type { EventName, EventProps, TrackPayload } from "@/lib/analytics/events";
import { readSource, stripSource, type LandingSource } from "@/lib/url/source";

const ENDPOINT = "/api/track";

export function track<E extends EventName>(event: E, props?: EventProps<E>): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: TrackPayload = {
    event,
    locale: document.documentElement.lang || undefined,
    path: window.location.pathname,
    props: { ...props, viewport: viewport(), ...landingSource() },
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

const SOURCE_KEY = "atlens_src";

/**
 * The `?src=` / `utm_*` tag the visit arrived with, kept for the tab so later events carry it too.
 * The tag is then dropped from the address bar, so a link copied from it is not credited to the
 * source this visit came from.
 */
function landingSource(): LandingSource {
  try {
    const fromUrl = readSource(window.location.search);
    if (fromUrl.src || fromUrl.campaign) {
      sessionStorage.setItem(SOURCE_KEY, JSON.stringify(fromUrl));
      const clean = stripSource(window.location.href);
      if (clean) {
        window.history.replaceState(window.history.state, "", clean);
      }
      return fromUrl;
    }
    const stored = sessionStorage.getItem(SOURCE_KEY);
    return stored ? (JSON.parse(stored) as LandingSource) : {};
  } catch {
    return {};
  }
}
