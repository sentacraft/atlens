"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/** The page's current URL for a poster's QR code; empty during server rendering. */
export function useShareUrl(): string {
  return useSyncExternalStore(subscribe, () => window.location.href, () => "");
}
