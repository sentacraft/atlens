"use client";

import { useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCompare } from "@/context/CompareProvider";
import { useCompareLensSearch } from "@/hooks/useCompareLensSearch";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";
import { motion, AnimatePresence } from "motion/react";
import { spring } from "@/lib/animation";
import { Plus, X } from "lucide-react";
import LensSearchDialog from "@/components/browse/LensSearchDialog";
import { ScrollChevron } from "@/components/ui/scroll-chevron";
import { cn } from "@/lib/utils";
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS, PAGE_GUTTER_CLS } from "@/config/ui-tokens";
import { Z } from "@/config/ui";
import { lensDisplayName, lensSubtitleLine, brandLabel } from "@/lib/lens/format";
import type { Lens } from "@/lib/types";
import { buildComparePath } from "@/lib/url/compare";

export default function CompareBar({ allLenses }: { allLenses: Lens[] }) {
  const t = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const tCompare = useTranslations("Compare");
  const router = useRouter();
  const mount = useEffectiveMount();
  const { compareIds, remove } = useCompare();
  const search = useCompareLensSearch();
  const clearCompareWithUndo = useClearCompareWithUndo();

  const mountLenses = allLenses.filter((lens) => lens.mount === mount);
  const selectedLenses = compareIds
    .map((id) => mountLenses.find((l) => l.id === id))
    .filter((lens) => lens !== undefined);

  const chipsRef = useRef<HTMLDivElement>(null);

  const observerRef = useRef<ResizeObserver | null>(null);

  const barRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (el) {
      observerRef.current = new ResizeObserver(([entry]) => {
        document.documentElement.style.setProperty(
          "--compare-bar-height",
          `${entry.target.getBoundingClientRect().height}px`
        );
      });
      observerRef.current.observe(el, { box: "border-box" });
    } else {
      document.documentElement.style.setProperty("--compare-bar-height", "0px");
    }
  }, []);

  function handleCompare() {
    router.push(buildComparePath(mount, selectedLenses.map((l) => l.id)));
  }

  return (
    <AnimatePresence>
      {selectedLenses.length > 0 && (
        <motion.div
          key="compare-bar"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={spring.snappy}
          ref={barRef}
          data-testid="compare-bar"
          className={`fixed bottom-[var(--tab-bar-height)] left-0 right-[var(--iris-panel-width,0px)] pl-[var(--iris-page-start,0px)] transition-[right,padding] duration-300 ease-out motion-reduce:transition-none ${Z.fixed} border-t border-zinc-200 bg-white/95 backdrop-blur-sm pb-[var(--safe-inset-bottom)] max-sm:pb-0`}
        >
          <div className={`mx-auto flex max-w-7xl items-center gap-3 py-2.5 sm:gap-4 sm:py-3 ${PAGE_GUTTER_CLS}`}>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 sm:hidden">
              {t("compareSelected", { count: selectedLenses.length })}
            </p>
            <HorizontalScrollRail
              scrollRef={chipsRef}
              className="min-w-0 flex-1 gap-2"
              wrapperClassName="hidden min-w-0 flex-1 sm:flex"
              fadeBg="from-white"
              deps={[compareIds.length]}
              renderOverlay={({ canScrollLeft, canScrollRight }) => (
                <>
                  <ScrollChevron
                    direction="left"
                    visible={canScrollLeft}
                    onClick={() => chipsRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
                    ariaLabel={tCompare("scrollChipsLeft")}
                    className="hidden sm:inline-flex"
                  />
                  <ScrollChevron
                    direction="right"
                    visible={canScrollRight}
                    onClick={() => chipsRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
                    ariaLabel={tCompare("scrollChipsRight")}
                    className="hidden sm:inline-flex"
                  />
                </>
              )}
            >
              <AnimatePresence mode="popLayout">
                {selectedLenses.map((lens) => {
                  const brandName = brandLabel(tBrand, lens.brand);
                  const displayName = lensDisplayName(brandName, lens.series, lens.model);

                  return (
                    <motion.div
                      key={lens.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={spring.snappy}
                      className="flex items-start gap-1.5 shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5"
                    >
                      <span className="flex max-w-[132px] min-w-0 flex-col leading-tight sm:max-w-[168px]">
                        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {lensSubtitleLine(brandName, lens.series)}
                        </span>
                        <span className="truncate text-xs font-medium text-zinc-900">
                          {lens.model}
                        </span>
                      </span>
                      <button
                        onClick={() => remove(lens.id)}
                        className={cn(
                          ICON_CLOSE_BTN_CLS,
                          "relative h-5 w-5 -mr-0.5 mt-0.5",
                          "before:absolute before:-inset-2 before:content-['']",
                        )}
                        aria-label={tCompare("removeLens", { model: displayName })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </HorizontalScrollRail>
            <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={clearCompareWithUndo}
                className="shrink-0 inline-flex h-9 items-center text-sm font-medium px-3 rounded-xl text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-800 transition-colors"
              >
                {t("clearCompare")}
              </button>
              <button
                type="button"
                onClick={search.openSearch}
                aria-label={tCompare("addLens")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
              >
                <Plus className="h-4 w-4" />
              </button>
              <LensSearchDialog {...search.dialogProps} lenses={mountLenses} />
              <button
                onClick={handleCompare}
                className={`shrink-0 inline-flex h-9 items-center text-sm font-medium px-4 rounded-xl ${ACTION_PRIMARY_CLS}`}
              >
                {t("goCompare", { count: selectedLenses.length })}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
