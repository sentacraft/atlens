"use client";

import { useCallback, useSyncExternalStore } from "react";

// Client-side environment sensors. Each reads a live, mutable browser source
// (viewport width / user-agent / on-screen keyboard) through useSyncExternalStore
// for a tear-free, hydration-safe value. Grouped here because they share that one
// pattern — note useBreakpoint (a VIEWPORT check) and useIsMobileDevice (a DEVICE
// check) are deliberately distinct axes, kept side by side so the contrast stays
// visible.

// ── useBreakpoint ─────────────────────────────────────────────────────────────
// Tailwind v4 exposes every @theme breakpoint as a CSS custom property
// (e.g. --breakpoint-sm: 40rem) on :root, so Tailwind's config stays the
// single source of truth for both CSS and JS.
type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

function getMediaQuery(bp: Breakpoint): MediaQueryList | null {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--breakpoint-${bp}`)
    .trim();
  return value ? window.matchMedia(`(min-width: ${value})`) : null;
}

/**
 * Returns whether the viewport is at least as wide as the given Tailwind
 * breakpoint. Reads the value from Tailwind's auto-injected --breakpoint-*
 * CSS variable, so changing the Tailwind theme propagates automatically.
 *
 * Note: this is a viewport check, not a device check. A desktop browser
 * resized to 400px reads as below `sm`. (For a device check, see
 * useIsMobileDevice.)
 *
 * matchMedia is a live, mutable browser source (resize / orientation), so this
 * uses useSyncExternalStore — the same pattern as useCountryCode — for a
 * tear-free, hydration-safe read.
 */
export function useBreakpoint(bp: Breakpoint): boolean {
  // bp is captured in the closures, so memoize them — a fresh identity each
  // render would make useSyncExternalStore re-subscribe every time.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = getMediaQuery(bp);
      if (!mq) {
        return () => {};
      }
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [bp],
  );

  const getSnapshot = useCallback(() => getMediaQuery(bp)?.matches ?? false, [bp]);

  // false during SSR + hydration (no matchMedia on the server), corrected on the
  // client right after hydration.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// ── useIsMobileDevice ─────────────────────────────────────────────────────────
// Phone/tablet user-agent test — a DEVICE check, deliberately distinct from
// useBreakpoint, which is a VIEWPORT check. A desktop browser resized narrow is
// still a desktop here (no native app to hand off to); a tablet in a wide
// viewport is still mobile. Purchase links use this to decide whether to target
// the mobile H5 domains (native "open in app" handoff) or the desktop search
// sites.
//
// The hand-rolled regex is deliberate: all we need is one mobile/desktop boolean
// for a non-critical URL choice. If device classification ever gets more
// demanding (precise OS/device, or handling UA spoofing like iPadOS posing as
// macOS), reach for a maintained library (ua-parser-js) instead of growing this
// regex.
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

function getMobileSnapshot(): boolean {
  return MOBILE_UA.test(navigator.userAgent);
}

// Desktop default on the server, so statically generated HTML carries desktop
// URLs; the client swaps to the real value post-hydration. Same
// useSyncExternalStore pattern as useCountryCode — keeps pages static (no
// dynamic SSR) without a hydration mismatch. Device class is stable within a
// session, so subscribe is a no-op.
function getMobileServerSnapshot(): boolean {
  return false;
}

function subscribeMobile(): () => void {
  return () => {};
}

export function useIsMobileDevice(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot);
}

// ── useKeyboardInset ──────────────────────────────────────────────────────────
// Pixels the on-screen keyboard overlaps the bottom of the layout viewport (0 when
// closed). iOS shrinks only the visual viewport when the keyboard opens, so this is
// `innerHeight - visualViewport.height - offsetTop`. Intended for a narrow use: sizing
// a bottom spacer inside a scroll region so its last rows can clear the keyboard. This
// does NOT reposition any fixed element — see [[reference_ios_keyboard_fixed_overlay]]
// for why driving a fixed overlay's position off visualViewport is a dead end.
//
// visualViewport is a live, mutable browser source (fires resize/scroll as the
// keyboard animates), so this uses useSyncExternalStore for a tear-free read.

function subscribeKeyboard(onChange: () => void): () => void {
  const vv = window.visualViewport;
  if (!vv) {
    return () => {};
  }
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

function getKeyboardSnapshot(): number {
  const vv = window.visualViewport;
  if (!vv) {
    return 0;
  }
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

// No keyboard on the server; 0 during SSR + hydration.
function getKeyboardServerSnapshot(): number {
  return 0;
}

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribeKeyboard, getKeyboardSnapshot, getKeyboardServerSnapshot);
}
