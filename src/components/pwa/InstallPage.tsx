"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { track } from "@/lib/analytics/analytics";
import { browsePath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

interface PwaInstallElement extends HTMLElement {
  externalPromptEvent: Event | null;
  styles: Record<string, string>;
  isInstallAvailable: boolean;
  isAppleMobilePlatform: boolean;
  isAppleDesktopPlatform: boolean;
  isAndroidFallback: boolean;
  isInAppBrowser: boolean;
  isUnderStandaloneMode: boolean;
  isWebInstallSupported: boolean;
  install: () => Promise<void>;
  showDialog: (forced?: boolean) => void;
  updateComplete?: Promise<boolean>;
}

type InstallStatus = "loading" | "installed" | "native" | "guide" | "hint";

const TINT_STYLES = { "--tint-color": "#18181b" };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPage() {
  const t = useTranslations("Install");
  const description = t("metaDescription");
  const [status, setStatus] = useState<InstallStatus>("loading");
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<PwaInstallElement | null>(null);
  const earlyPromptRef = useRef<Event | null>(null);
  const trackedInstallRef = useRef(false);

  useEffect(() => {
    if (isStandalone()) {
      setStatus("installed");
      return;
    }

    let cancelled = false;
    let mountedEl: PwaInstallElement | null = null;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      earlyPromptRef.current = event;
      if (elRef.current) {
        elRef.current.externalPromptEvent = event;
      }
      setStatus((prev) => (prev === "hint" ? "native" : prev));
    };

    const onInstallAvailable = () => {
      if (mountedEl && !(mountedEl.isAppleMobilePlatform || mountedEl.isAppleDesktopPlatform || mountedEl.isAndroidFallback || mountedEl.isInAppBrowser)) {
        setStatus((prev) => (prev === "hint" ? "native" : prev));
      }
    };

    const onInstallSuccess = () => {
      if (!trackedInstallRef.current) {
        trackedInstallRef.current = true;
        track("install_action");
      }
      setStatus("installed");
    };

    const onInstallFail = () => {
      if (!earlyPromptRef.current) {
        setStatus("hint");
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    void (async () => {
      await import("@khmyznikov/pwa-install");
      if (cancelled || !hostRef.current) {
        return;
      }

      const el = document.createElement("pwa-install") as PwaInstallElement;
      el.setAttribute("manifest-url", "/manifest.webmanifest");
      el.setAttribute("manual-apple", "");
      el.setAttribute("manual-chrome", "");
      el.setAttribute("manual-how-to", "");
      el.setAttribute("description", description);
      el.setAttribute("styles", JSON.stringify(TINT_STYLES));
      el.styles = TINT_STYLES;
      if (earlyPromptRef.current) {
        el.externalPromptEvent = earlyPromptRef.current;
      }

      el.addEventListener("pwa-install-available-event", onInstallAvailable);
      el.addEventListener("pwa-install-success-event", onInstallSuccess);
      el.addEventListener("pwa-install-fail-event", onInstallFail);

      mountedEl = el;
      elRef.current = el;
      hostRef.current.replaceChildren(el);

      if (el.updateComplete) {
        await el.updateComplete;
      }
      if (cancelled) {
        return;
      }

      if (el.isUnderStandaloneMode || isStandalone()) {
        setStatus("installed");
        return;
      }
      if (
        el.isAppleMobilePlatform ||
        el.isAppleDesktopPlatform ||
        el.isAndroidFallback ||
        el.isInAppBrowser
      ) {
        setStatus("guide");
        return;
      }
      if (earlyPromptRef.current || el.isWebInstallSupported || el.isInstallAvailable) {
        setStatus("native");
        return;
      }
      setStatus("hint");
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      if (mountedEl) {
        mountedEl.removeEventListener("pwa-install-available-event", onInstallAvailable);
        mountedEl.removeEventListener("pwa-install-success-event", onInstallSuccess);
        mountedEl.removeEventListener("pwa-install-fail-event", onInstallFail);
        mountedEl.remove();
      }
      elRef.current = null;
    };
  }, [description]);

  function handleAction() {
    const el = elRef.current;
    if (!el) {
      return;
    }
    if (status === "native") {
      void el.install();
      return;
    }
    el.showDialog(true);
  }

  return (
    <>
      {status !== "installed" ? <div ref={hostRef} /> : null}
      {status === "loading" ? null : (
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon is a static asset, not an optimized image */}
          <img
            src="/icons/icon-192-white.png"
            alt="Atlens"
            className="mb-8 h-20 w-20 rounded-[22%] shadow-lg"
          />

          {status === "installed" ? (
            <div className="max-w-xs">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-800">
                {t("installedTitle")}
              </h2>
              <p className="mt-3 text-sm text-zinc-500">{t("installedBody")}</p>
              <Link
                href={browsePath("X")}
                className={cn(
                  ACTION_PRIMARY_CLS,
                  "mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium",
                )}
              >
                {t("openApp")} →
              </Link>
            </div>
          ) : (
            <div className="max-w-xs">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-800">
                {t("promptTitle")}
              </h2>
              <p className="mt-3 text-sm text-zinc-500">{t("promptBody")}</p>
              {status === "hint" ? (
                <p className="mt-6 text-sm leading-relaxed text-zinc-600">{t("genericBody")}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleAction}
                  className={cn(
                    ACTION_PRIMARY_CLS,
                    "mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium",
                  )}
                >
                  {t("installButton")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
