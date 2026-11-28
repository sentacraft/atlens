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
  showDialog: (forced?: boolean) => void;
  updateComplete?: Promise<boolean>;
}

type InstallStatus = "loading" | "ready" | "installed";

const TINT_STYLES = { "--tint-color": "#18181b" };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPage() {
  const t = useTranslations("Install");
  const [status, setStatus] = useState<InstallStatus>("loading");
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<PwaInstallElement | null>(null);
  const earlyPromptRef = useRef<Event | null>(null);
  const autoOpenedRef = useRef(false);
  const trackedInstallRef = useRef(false);

  useEffect(() => {
    if (isStandalone()) {
      setStatus("installed");
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      earlyPromptRef.current = event;
      if (elRef.current) {
        elRef.current.externalPromptEvent = event;
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    setStatus("ready");

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    let cancelled = false;
    let mountedEl: PwaInstallElement | null = null;
    const onInstallSuccess = () => {
      if (!trackedInstallRef.current) {
        trackedInstallRef.current = true;
        track("install_action");
      }
      setStatus("installed");
    };

    void (async () => {
      await import("@khmyznikov/pwa-install");
      if (cancelled || !hostRef.current) {
        return;
      }

      const el = document.createElement("pwa-install") as PwaInstallElement;
      el.setAttribute("manifest-url", "/manifest.webmanifest");
      el.setAttribute("manual-apple", "");
      el.setAttribute("manual-chrome", "");
      el.setAttribute("styles", JSON.stringify(TINT_STYLES));
      el.styles = TINT_STYLES;
      if (earlyPromptRef.current) {
        el.externalPromptEvent = earlyPromptRef.current;
      }
      el.addEventListener("pwa-install-success-event", onInstallSuccess);

      mountedEl = el;
      elRef.current = el;
      hostRef.current.replaceChildren(el);

      // Wait for Lit's connectedCallback/manifest init so manual-* flags do not hide our initial showDialog(true).
      if (el.updateComplete) {
        await el.updateComplete;
      }
      if (!cancelled && !autoOpenedRef.current) {
        autoOpenedRef.current = true;
        el.showDialog(true);
      }
    })();

    return () => {
      cancelled = true;
      if (mountedEl) {
        mountedEl.removeEventListener("pwa-install-success-event", onInstallSuccess);
        mountedEl.remove();
      }
      elRef.current = null;
    };
  }, [status]);

  if (status === "loading") {
    return null;
  }

  return (
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
          <button
            type="button"
            onClick={() => elRef.current?.showDialog(true)}
            className={cn(
              ACTION_PRIMARY_CLS,
              "mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium",
            )}
          >
            {t("installButton")}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500">{t("genericBody")}</p>
          <div ref={hostRef} />
        </div>
      )}
    </div>
  );
}
