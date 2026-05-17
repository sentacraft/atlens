"use client";

import { useEffect, useState } from "react";

// Tailwind v4 exposes every @theme breakpoint as a CSS custom property
// (e.g. --breakpoint-sm: 40rem) on :root, so Tailwind's config stays the
// single source of truth for both CSS and JS.
type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Returns whether the viewport is at least as wide as the given Tailwind
 * breakpoint. Reads the value from Tailwind's auto-injected --breakpoint-*
 * CSS variable, so changing the Tailwind theme propagates automatically.
 *
 * Note: this is a viewport check, not a device check. A desktop browser
 * resized to 400px will read as below `sm`.
 */
export function useBreakpoint(bp: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--breakpoint-${bp}`)
      .trim();
    if (!value) {return;}
    const mq = window.matchMedia(`(min-width: ${value})`);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [bp]);

  return matches;
}
