"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Augment the standard Event type with the non-standard Chrome prompt API.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform =
  | "loading"       // initial — waiting for beforeinstallprompt or timeout
  | "installed"     // already running as a standalone PWA
  | "prompt"        // Chrome/Edge/Android — programmatic install available
  | "ios"           // iOS — manual Add to Home Screen flow
  | "macos-safari"  // macOS Safari — Share → Add to Dock
  | "generic";      // everything else — show browser menu hint

function detectSync(): Platform | null {
  // Check standalone mode first (works everywhere).
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return "ios";
  }

  // macOS Safari — does not fire beforeinstallprompt; uses Share → Add to Dock.
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Edg\//.test(ua)) {
    return "macos-safari";
  }

  return null; // unknown — wait for beforeinstallprompt
}

const IOS_STEPS = ["iosStep1", "iosStep2", "iosStep3"] as const;
const MACOS_STEPS = ["macosStep1", "macosStep2", "macosStep3"] as const;

export default function InstallPage() {
  const t = useTranslations("Install");
  const [platform, setPlatform] = useState<Platform>("loading");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const sync = detectSync();
    if (sync) {
      setPlatform(sync);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setPlatform("prompt");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // If the event never fires (unsupported browser), fall back to generic hint.
    const timer = setTimeout(() => {
      setPlatform((prev) => (prev === "loading" ? "generic" : prev));
    }, 600);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setPlatform("installed");
  }

  // Render nothing during the brief detection window to avoid layout flash.
  if (platform === "loading") return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
      {/* App icon — shows the user exactly what will appear on their home screen */}
      {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon is a static asset, not an optimized image */}
      <img
        src="/icons/icon-192-white.png"
        alt="X-Glass"
        className="w-20 h-20 rounded-[22%] shadow-lg mb-8"
      />

      {platform === "installed" && (
        <div className="max-w-xs">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50">
            {t("installedTitle")}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm">{t("installedBody")}</p>
          <Link
            href="/lenses"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
          >
            {t("openApp")} →
          </Link>
        </div>
      )}

      {platform === "prompt" && (
        <div className="max-w-xs">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50">
            {t("promptTitle")}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm">{t("promptBody")}</p>
          <button
            onClick={handleInstall}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
          >
            {t("installButton")}
          </button>
        </div>
      )}

      {platform === "ios" && (
        <div className="max-w-xs w-full">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50">
            {t("iosTitle")}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm">{t("iosSubtitle")}</p>
          <ol className="mt-6 space-y-3 text-left">
            {IOS_STEPS.map((key, i) => (
              <li
                key={key}
                className="flex items-start gap-4 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {platform === "macos-safari" && (
        <div className="max-w-xs w-full">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50">
            {t("macosTitle")}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm">{t("macosSubtitle")}</p>
          <ol className="mt-6 space-y-3 text-left">
            {MACOS_STEPS.map((key, i) => (
              <li
                key={key}
                className="flex items-start gap-4 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {platform === "generic" && (
        <div className="max-w-xs">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-50">
            {t("genericTitle")}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm">{t("genericBody")}</p>
        </div>
      )}
    </div>
  );
}
