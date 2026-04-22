// Offline fallback page served by the service worker when a navigation request
// fails due to no network. Intentionally outside the [locale] routing tree so
// the service worker can pre-cache and serve it at /offline without redirects.
// Hardcoded English — not connected to next-intl.

// force-static keeps this page pre-rendered at build time even though the
// root layout is now async (getLocale). Server component wrapper is required
// because "use client" pages cannot export route segment config.
export const dynamic = "force-static";

export { default } from "./OfflineContent";
