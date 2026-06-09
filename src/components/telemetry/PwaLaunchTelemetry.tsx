"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/analytics";

// Set of recognized launch-attribution sources, anchored to the values
// written into the manifest's start_url and shortcut URLs. Anything else
// in the `ref` query slot is ignored so unrelated traffic (someone manually
// typing ?ref=foo) doesn't pollute the pwa_launch event stream.
const VALID_REFS = new Set(["pwa", "pwa-browse", "pwa-compare"]);

// sessionStorage guard prevents a second fire if the user refreshes the
// landing URL while the ?ref= param is still present. One launch per
// browser session is the right grain for cold-launch attribution.
const STORAGE_KEY = "xg_pwa_launch_fired";

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
      // Private mode / disabled storage — still fire, just without the guard.
    }
    track("pwa_launch", { source: ref });

    // Strip ?ref from the URL so a copied/shared link doesn't re-attribute
    // an external visitor as a PWA launch.
    params.delete("ref");
    const qs = params.toString();
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", next);
  }, []);

  return null;
}
