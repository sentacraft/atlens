"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface PromoBannerProps {
  /** Body text. */
  message: string;
  /** Call-to-action link text (e.g. "查看专题"). */
  ctaLabel: string;
  /** Internal route the CTA links to. */
  ctaHref: string;
  /** Cookie name used to remember dismissal. Should be unique per campaign.
   * The caller (server component) decides initial visibility by reading this
   * cookie server-side and conditionally rendering PromoBanner — this avoids
   * the layout-shift that a useEffect/localStorage gate would cause. */
  dismissKey: string;
  /** Aria label / tooltip for the dismiss button. */
  dismissLabel: string;
}

/**
 * Generic one-line promo strip with persistent dismiss. Visibility on first
 * paint is gated by the server component above us (which reads the dismiss
 * cookie) — see callers like the /lenses/[mount] browse page. Once visible,
 * the dismiss action writes a cookie + collapses the banner immediately.
 */
export default function PromoBanner({
  message,
  ctaLabel,
  ctaHref,
  dismissKey,
  dismissLabel,
}: PromoBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    // 1-year max-age; Lax SameSite is fine since the cookie is purely a
    // client-side UX preference, not an auth/identity signal.
    document.cookie = `${dismissKey}=1; max-age=31536000; path=/; SameSite=Lax`;
    setVisible(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[12px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
      <span className="min-w-0 truncate">{message}</span>
      <Link
        href={ctaHref}
        prefetch={false}
        className="inline-flex shrink-0 items-center gap-1 font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-50"
      >
        {ctaLabel}
        <ArrowRight className="size-3" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={dismissLabel}
        className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
