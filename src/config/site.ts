// Global site / brand configuration — single source of truth for metadata that
// appears across multiple contexts: PWA manifest, <head> meta tags, OG image.
//
// Keep this file framework-agnostic (no Next.js imports) so it can be consumed
// by scripts, the pipeline, and future packages in a monorepo.

export interface SiteConfig {
  /** Full display name shown in browser chrome and install prompts. */
  name: string;
  /** Short name for home screen icons (≤ 12 chars recommended). */
  shortName: string;
  /** PWA manifest description — shown in install prompts and app stores. No locale context available. */
  pwaDescription: string;
  /** Theme color for browser UI chrome, keyed by color scheme. */
  themeColor: { light: string; dark: string };
  /**
   * Background color shown on the PWA splash screen before the first paint.
   * Should match the app's primary background to avoid a flash.
   */
  backgroundColor: string;
  /** PWA display mode. "standalone" hides browser UI. */
  display: "standalone" | "minimal-ui" | "fullscreen" | "browser";
}

export const SITE: SiteConfig = {
  name: "X-Glass",
  shortName: "X-Glass",
  pwaDescription:
    "Your pocket database for X-Mount lenses — specs normalized, offline-ready, zero noise.",
  themeColor: {
    light: "#ffffff",
    dark: "#0a0a0a",
  },
  // White splash screen — matches the light-mode app background so most users
  // (light-mode default) see a seamless launch. Dark-mode users see a brief
  // white flash, but that is preferable to the reverse on the majority case.
  backgroundColor: "#ffffff",
  display: "standalone",
};
