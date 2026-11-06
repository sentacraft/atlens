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

function sourceParams(search: string): { src?: string; campaign?: string } {
  const params = new URLSearchParams(search);
  const src = params.get("src") ?? params.get("utm_source") ?? undefined;
  const campaign = params.get("utm_campaign") ?? undefined;
  return { ...(src ? { src } : {}), ...(campaign ? { campaign } : {}) };
}

/** The `?src=` / `utm_*` tag the visit arrived with, kept for the tab so later events carry it too. */
function landingSource(): { src?: string; campaign?: string } {
  try {
    const fromUrl = sourceParams(window.location.search);
    if (fromUrl.src || fromUrl.campaign) {
      sessionStorage.setItem(SOURCE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(SOURCE_KEY);
    return stored ? (JSON.parse(stored) as { src?: string; campaign?: string }) : {};
  } catch {
    return {};
  }
}
