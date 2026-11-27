"use client";

import { matchesBreakpoint } from "@/lib/breakpoints";
import type { EventName, EventProps, TrackPayload } from "@/lib/analytics/events";
import { readSource, stripSource, type LandingSource } from "@/lib/url/source";

const ENDPOINT = "/api/track";
const VID_READY_KEY = "atlens_vid_ready";

let vidReady = false;
let initializing = false;
let pendingBodies: string[] = [];
let pagehideAttached = false;

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

  if (isVidReady()) {
    sendNow(body);
    return;
  }

  if (initializing) {
    queuePending(body);
    return;
  }

  // Send the tab's first event via fetch so Set-Cookie applies atlens_vid before any concurrent sendBeacon fires.
  sendInitial(body);
}

export function resetAnalyticsForTests(): void {
  if (pagehideAttached && typeof window !== "undefined") {
    window.removeEventListener("pagehide", flushPending);
  }
  vidReady = false;
  initializing = false;
  pendingBodies = [];
  pagehideAttached = false;
}

function isVidReady(): boolean {
  if (vidReady) {
    return true;
  }
  try {
    if (sessionStorage.getItem(VID_READY_KEY) === "1") {
      vidReady = true;
      return true;
    }
  } catch {
  }
  return false;
}

function markVidReady(): void {
  vidReady = true;
  try {
    sessionStorage.setItem(VID_READY_KEY, "1");
  } catch {
  }
}

function sendInitial(body: string): void {
  if (typeof fetch !== "function") {
    markVidReady();
    sendNow(body);
    return;
  }

  initializing = true;
  void (async () => {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
      if (res?.ok !== false) {
        markVidReady();
      }
    } catch {
    } finally {
      initializing = false;
      flushPending();
    }
  })();
}

function queuePending(body: string): void {
  pendingBodies.push(body);
  if (!pagehideAttached) {
    pagehideAttached = true;
    window.addEventListener("pagehide", flushPending, { once: true });
  }
}

function flushPending(): void {
  if (pagehideAttached) {
    window.removeEventListener("pagehide", flushPending);
    pagehideAttached = false;
  }
  if (pendingBodies.length === 0) {
    return;
  }
  const bodies = pendingBodies;
  pendingBodies = [];
  for (const body of bodies) {
    sendNow(body);
  }
}

function sendNow(body: string): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
    if (typeof fetch === "function") {
      void fetch(ENDPOINT, {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
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
