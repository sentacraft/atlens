"use client";

import { useEffect } from "react";

// Registers the service worker once on first client render.
// Mounted in the root layout so it runs on every page.
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {

      // In dev, unregister any SW (e.g. left over from a prod build) so that
      // its cache-first strategy never intercepts Turbopack's hot-updated bundles.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
      return;

    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("[SW] Registration failed:", err));
  }, []);

  return null;
}
