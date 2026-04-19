"use client";

import { useEffect, useRef, useState } from "react";
import { Z } from "@/config/ui";
import { useTranslations } from "next-intl";
import { ShareButton } from "@/components/ShareButton";
import CompareAddLensButton from "@/components/CompareAddLensButton";
import BackButton from "@/components/BackButton";
import { useCompare } from "@/context/CompareProvider";
import { useRouter } from "@/i18n/navigation";
import type { Lens } from "@/lib/types";

interface Props {
  lenses: Lens[];
  fallbackHref: string;
  /** Matches CompareTable minColumns — button is hidden while empty slot columns are visible. */
  minColumns?: number;
  /** Preset title to use as the default share poster title. */
  presetTitle?: string;
}

export default function ComparePageHeader({ lenses, fallbackHref, minColumns = 0, presetTitle }: Props) {
  const t = useTranslations("Compare");
  const tList = useTranslations("LensList");
  const { clearCompare } = useCompare();
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const [showFab, setShowFab] = useState(false);
  // Show the FAB when the header row scrolls behind the nav bar
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { root: null, rootMargin: "0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={headerRef} className="flex items-center gap-3">
        <BackButton fallbackHref={fallbackHref} />
        <h1 className="hidden sm:block text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
        {lenses.length >= minColumns && <CompareAddLensButton lenses={lenses} />}
        {lenses.length > 0 && (
          <button
            onClick={() => { clearCompare(); router.replace("/lenses/compare"); }}
            className="shrink-0 text-sm font-medium px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {tList("clearCompare")}
          </button>
        )}
        {lenses.length >= 1 && (
          <div className="ml-auto">
            <ShareButton lenses={lenses} presetTitle={presetTitle} />
          </div>
        )}
      </div>

      {/* Floating share FAB — slides up when the header share button is out of view */}
      <div
        data-testid="compare-share-fab"
        className={`fixed bottom-6 right-4 ${Z.fixed} transition-all duration-200 sm:right-6 ${
          showFab && lenses.length >= 1
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
        aria-hidden={!(showFab && lenses.length >= 1)}
      >
        <ShareButton lenses={lenses} variant="fab" presetTitle={presetTitle} />
      </div>
    </>
  );
}
