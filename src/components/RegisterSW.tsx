"use client";

import { useEffect } from "react";

// Registers the service worker once on first client render.
// Mounted in the root layout so it runs on every page.
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("[SW] Registration failed:", err));
    }
  }, []);

  return null;
}
