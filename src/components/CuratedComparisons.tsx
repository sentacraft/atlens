"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCompareUrl } from "@/hooks/useCompareUrl";
import { useCompare } from "@/context/CompareProvider";
import { trendingPresets, type TrendingPreset } from "@/lib/trending";
import { allLenses } from "@/lib/lens";
import { cn } from "@/lib/utils";

export function PresetCard({ preset, onSelect }: { preset: TrendingPreset; onSelect?: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";
  const { buildCompareUrl } = useCompareUrl();

  const lenses = preset.lensIds
    .map((id) => allLenses.find((l) => l.id === id))
    .filter(Boolean);

  function handleClick() {
    router.replace(buildCompareUrl(preset.lensIds, { preset: preset.slug }));
    onSelect?.();
  }

  return (
    <button
      onClick={handleClick}
      className="group text-left w-full h-full flex flex-col rounded-xl border border-zinc-200 bg-white px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
    >
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
        {preset.title[lang]}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
        {preset.subtitle[lang]}
      </p>

      {/* Lens model badge strip */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {lenses.map((lens) => {
          if (!lens) return null;
          return (
            <span
              key={lens.id}
              className="inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {lens.brand.charAt(0).toUpperCase() + lens.brand.slice(1)} {lens.model}
            </span>
          );
        })}
      </div>

      {/* CTA — fades in on hover */}
      <p className="mt-auto pt-3 text-xs font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-500">
        Compare Now →
      </p>
    </button>
  );
}

export default function CuratedComparisons() {
  const { compareIds } = useCompare();
  const t = useTranslations("Compare");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, []);

  function scrollToDir(dir: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const approxCardWidth = el.scrollWidth / trendingPresets.length;
    el.scrollBy({ left: dir * approxCardWidth, behavior: "smooth" });
  }

  if (compareIds.length > 0) return null;

  return (
    <div className="mb-2">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 mt-1">
        {t("curatedHint")}
      </p>

      {/* Mobile: horizontal snap carousel */}
      <div className="sm:hidden relative -mx-4">
        {/* Left chevron */}
        <button
          onClick={() => scrollToDir(-1)}
          aria-label="Scroll left"
          className={cn(
            "absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1 pr-6 bg-gradient-to-r from-white/90 to-transparent transition-opacity dark:from-zinc-950/90",
            canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        </button>

        {/* Scroll container — scrollbar hidden */}
        <div
          ref={scrollRef}
          className="overflow-x-auto snap-x snap-mandatory scroll-pl-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          <div className="flex items-stretch gap-2 px-4 pb-0.5">
            {trendingPresets.map((preset) => (
              <div key={preset.slug} className="shrink-0 snap-start w-[calc((100vw-2.5rem)/1.5)]">
                <PresetCard preset={preset} />
              </div>
            ))}
            <div className="shrink-0 w-2" aria-hidden="true" />
          </div>
        </div>

        {/* Right chevron */}
        <button
          onClick={() => scrollToDir(1)}
          aria-label="Scroll right"
          className={cn(
            "absolute right-0 top-0 bottom-0 z-10 flex items-center pl-6 pr-1 bg-gradient-to-l from-white/90 to-transparent transition-opacity dark:from-zinc-950/90",
            canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        </button>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {trendingPresets.map((preset) => (
          <PresetCard key={preset.slug} preset={preset} />
        ))}
      </div>
    </div>
  );
}
