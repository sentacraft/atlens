"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCompareUrl } from "@/hooks/useCompareUrl";
import { buildHorizontalScrollMask, useHorizontalScrollAffordance } from "@/hooks/useHorizontalScrollAffordance";
import { useMountedCompare } from "@/context/CompareProvider";
import { curatedPresets, type CuratedPreset } from "@/lib/curated-presets";
import { getAllLenses } from "@/lib/lens";
import { lensDisplayName } from "@/lib/lens.format";
import { ScrollChevron } from "@/components/ui/scroll-chevron";

export function PresetCard({ preset, onSelect }: { preset: CuratedPreset; onSelect?: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";
  const { buildCompareUrl } = useCompareUrl();
  const tBrand = useTranslations("Brands");
  const tCompare = useTranslations("Compare");

  const lenses = preset.lensIds
    .map((id) => getAllLenses(locale).find((l) => l.id === id))
    .filter(Boolean);

  function handleClick() {
    router.replace(buildCompareUrl(preset.lensIds));
    onSelect?.();
  }

  return (
    <button
      onClick={handleClick}
      className="group text-left w-full flex flex-col rounded-xl border border-zinc-200 bg-white px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
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
          if (!lens) {
            return null;
          }
          return (
            <span
              key={lens.id}
              className="inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {lensDisplayName(tBrand(lens.brand), lens.series, lens.model, lens.brand)}
            </span>
          );
        })}
      </div>

      {/* CTA — fades in on hover. The grid above uses `items-start` so
          cards size to content (no stretch); the hover-reveal of this CTA
          adds a row of text in flow rather than appearing inside an
          empty padding-bottom block. */}
      <p className="pt-3 text-xs font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-500">
        {tCompare("presetCardCta")} →
      </p>
    </button>
  );
}

export default function CuratedComparisons() {
  const { compareIds } = useMountedCompare();
  const t = useTranslations("Compare");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useHorizontalScrollAffordance(scrollRef);
  const scrollerMask = buildHorizontalScrollMask(canScrollLeft, canScrollRight);

  function scrollToDir(dir: -1 | 1) {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const approxCardWidth = el.scrollWidth / curatedPresets.length;
    el.scrollBy({ left: dir * approxCardWidth, behavior: "smooth" });
  }

  if (compareIds.length > 0) {

    return null;

  }

  return (
    <div className="mb-2">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 mt-1">
        {t("curatedHint")}
      </p>

      {/* Mobile: horizontal snap carousel */}
      <div className="sm:hidden relative -mx-4">
        {/* Scroll container — scrollbar hidden, edges feather via mask */}
        <div
          ref={scrollRef}
          className="overflow-x-auto snap-x snap-mandatory scroll-pl-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
          style={scrollerMask ? { maskImage: scrollerMask, WebkitMaskImage: scrollerMask } : undefined}
        >
          <div className="flex items-start gap-2 px-4 pb-0.5">
            {curatedPresets.map((preset) => (
              <div key={preset.slug} className="shrink-0 snap-start w-[calc((100vw-2.5rem)/1.5)]">
                <PresetCard preset={preset} />
              </div>
            ))}
            <div className="shrink-0 w-2" aria-hidden="true" />
          </div>
        </div>

        <ScrollChevron
          direction="left"
          visible={canScrollLeft}
          onClick={() => scrollToDir(-1)}
          ariaLabel={t("scrollChipsLeft")}
        />
        <ScrollChevron
          direction="right"
          visible={canScrollRight}
          onClick={() => scrollToDir(1)}
          ariaLabel={t("scrollChipsRight")}
        />
      </div>

      {/* Desktop: grid. `items-start` lets each card size to its own
          content height rather than stretching to the row's tallest —
          short cards no longer leave an empty padding block above the
          hover-reveal CTA. Cards in the same row may end at slightly
          different y, mirroring how Apple Music's content cards lay out. */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
        {curatedPresets.map((preset) => (
          <PresetCard key={preset.slug} preset={preset} />
        ))}
      </div>
    </div>
  );
}
