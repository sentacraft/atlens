"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface PromoBannerProps {
  /** Body text. */
  message: string;
  /** Call-to-action link text (e.g. "查看专题"). */
  ctaLabel: string;
  /** Internal route the CTA links to. */
  ctaHref: string;
  /** localStorage key used to remember dismissal. Should be unique per campaign. */
  dismissKey: string;
  /** Aria label / tooltip for the dismiss button. */
  dismissLabel: string;
}

/**
 * Generic one-line promo strip with persistent dismiss. Mounted client-side
 * only so a returning visitor who has dismissed it never sees it again; the
 * brief unrendered moment on first paint is acceptable since promo banners
 * are secondary discovery affordances, not critical UI.
 *
 * Callers supply the strings (so i18n stays in the call site) and a unique
 * `dismissKey` per campaign — different banners dismiss independently.
 */
export default function PromoBanner({
  message,
  ctaLabel,
  ctaHref,
  dismissKey,
  dismissLabel,
}: PromoBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(dismissKey)) {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable (private browsing, etc.) — fall
      // through to non-visible so we don't repeatedly nag in that mode.
    }
  }, [dismissKey]);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
      <span className="min-w-0 flex-1 truncate">{message}</span>
      <Link
        href={ctaHref}
        prefetch={false}
        className="inline-flex shrink-0 items-center gap-1 font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-100"
      >
        {ctaLabel}
        <ArrowRight className="size-3" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={dismissLabel}
        className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-amber-700/70 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200/70 dark:hover:bg-amber-900/40 dark:hover:text-amber-50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
