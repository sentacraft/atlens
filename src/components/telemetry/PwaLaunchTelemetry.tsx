"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/analytics";

const VALID_REFS = new Set(["pwa", "pwa-browse", "pwa-compare"]);

const STORAGE_KEY = "atlens_pwa_launch_fired";

export default function PwaLaunchTelemetry() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref || !VALID_REFS.has(ref)) {
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
    }
    track("pwa_launch", { source: ref });

    // Stripped so a shared link does not count as a PWA launch.
    params.delete("ref");
    const qs = params.toString();
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", next);
  }, []);

  return null;
}
