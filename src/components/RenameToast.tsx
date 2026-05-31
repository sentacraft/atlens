"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// One-time "X-Glass is now Atlens" notice for visitors who arrive via the
// legacy domain's 301 redirect, so the unfamiliar name/URL doesn't read as a
// hijack. It self-retires as legacy traffic decays — no hardcoded expiry.
//
// Trigger signals, in priority order:
//   1. `?from=xglass` query param — the legacy domain's redirect rule appends
//      this, and it survives a 301 (the redirect destination keeps the query
//      string). This is the reliable signal.
//   2. Referrer host — best-effort fallback; a 301 usually does NOT expose the
//      redirecting URL as the referrer, so this only catches direct inbound
//      links from the old host that haven't been redirected.
const LEGACY_HOST = "xglass.sentacraft.com";
const SEEN_KEY = "atlens:rename-notice-seen";

export default function RenameToast() {
  const t = useTranslations("Rename");

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) {
        return;
      }
    } catch {
      // localStorage unavailable (private mode / blocked) — skip dedupe and
      // fall through; the toast simply may show again next visit.
    }

    const fromLegacyQuery =
      new URLSearchParams(window.location.search).get("from") === "xglass";
    let fromLegacyReferrer = false;
    if (document.referrer) {
      try {
        fromLegacyReferrer = new URL(document.referrer).host === LEGACY_HOST;
      } catch {
        fromLegacyReferrer = false;
      }
    }

    if (!fromLegacyQuery && !fromLegacyReferrer) {
      return;
    }

    toast(t("toast"), { duration: 8000 });
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Best-effort persistence; ignore write failures.
    }
  }, [t]);

  return null;
}
