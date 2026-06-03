"use client";

import { useCallback, useSyncExternalStore } from "react";

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
