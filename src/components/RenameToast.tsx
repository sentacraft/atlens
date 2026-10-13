"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// `?from=xglass` is appended by the legacy domain's redirect; a 301 rarely exposes the referrer.
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
    }
  }, [t]);

  return null;
}
