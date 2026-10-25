export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

/** The media query for the theme's breakpoint, or null when the theme doesn't define it. */
export function breakpointQuery(bp: Breakpoint): MediaQueryList | null {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--breakpoint-${bp}`)
    .trim();
  return value ? window.matchMedia(`(min-width: ${value})`) : null;
}

/** Whether the window is at least as wide as the breakpoint, read once; components use useBreakpoint. */
export function matchesBreakpoint(bp: Breakpoint): boolean {
  return breakpointQuery(bp)?.matches ?? false;
}
