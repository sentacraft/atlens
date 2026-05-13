"use client";

import { useMemo, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getLensesByMount } from "@/lib/lens";
import { useMountedCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { motion, AnimatePresence } from "motion/react";
import { spring } from "@/lib/animation";
import { Plus, X } from "lucide-react";
import LensSearchDialog from "@/components/LensSearchDialog";
import { MAX_COMPARE } from "@/lib/lens";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS } from "@/lib/ui-tokens";
import { Z } from "@/config/ui";
import { lensDisplayName, lensSubtitleLine } from "@/lib/lens.format";

export default function CompareBar() {
  const t = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const tCompare = useTranslations("Compare");
  const router = useRouter();
  const locale = useLocale();
  const mount = useEffectiveMount();
  const { compareIds, toggleCompare, replaceCompare, clearCompare } = useMountedCompare();

  const handleAddLens = useCallback(
    (lens: Lens) => {
      if (compareIds.includes(lens.id) || compareIds.length >= MAX_COMPARE) {
        return;
      }
      replaceCompare([...compareIds, lens.id]);
    },
    [compareIds, replaceCompare]
  );

  const getAddResultState = useCallback(
    (candidate: Lens) => ({
      actionLabel: compareIds.includes(candidate.id)
        ? tCompare("alreadyAdded")
        : compareIds.length >= MAX_COMPARE
          ? tCompare("compareFull")
          : tCompare("addToCompareAction"),
      disabled:
        compareIds.includes(candidate.id) || compareIds.length >= MAX_COMPARE,
    }),
    [compareIds, tCompare]
  );

  const selectedLenses = useMemo(
    () =>
      compareIds
        .map((id) => getLensesByMount(mount, locale).find((l) => l.id === id))
        .filter((lens) => lens !== undefined),
    [compareIds, mount, locale]
  );

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
    const ids = selectedLenses.map((l) => l.id).join(",");
    const seg = mountToUrlSegment(mount);
    router.push(`/lenses/${seg}/compare?ids=${ids}`);
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
          className={`fixed bottom-0 left-0 right-0 ${Z.fixed} border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-sm pb-[var(--safe-inset-bottom)]`}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 -mx-5 px-5 sm:mx-0 sm:px-0 gap-2 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)] sm:[mask-image:none]">
              <AnimatePresence mode="popLayout">
                {selectedLenses.map((lens) => {
                  const brandName = tBrand(lens.brand);
                  const displayName = lensDisplayName(brandName, lens.series, lens.model, lens.brand);

                  return (
                    <motion.div
                      key={lens.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={spring.snappy}
                      className="flex items-start gap-1.5 shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 dark:bg-zinc-800"
                    >
                      <span className="flex max-w-[132px] min-w-0 flex-col leading-tight sm:max-w-[168px]">
                        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                          {lensSubtitleLine(brandName, lens.series)}
                        </span>
                        <span className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {lens.model}
                        </span>
                      </span>
                      <button
                        onClick={() => toggleCompare(lens.id)}
                        className={cn(ICON_CLOSE_BTN_CLS, "h-5 w-5 -mr-0.5 mt-0.5")}
                        aria-label={tCompare("removeLens", { model: displayName })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {/* Cluster ordering: destructive (清空) → additive (+) → primary CTA (查看对比).
                Left-to-right rising visual weight, and keeps the two button-shaped
                elements adjacent on the right so the text affordance doesn't sit
                marooned between two button silhouettes. */}
            <div className="flex items-center justify-end gap-3 sm:shrink-0">
              <button
                onClick={clearCompare}
                className="shrink-0 inline-flex h-9 items-center text-sm font-medium px-3 rounded-xl text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-800 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200 transition-colors"
              >
                {t("clearCompare")}
              </button>
              <LensSearchDialog
                onSelectLens={handleAddLens}
                getResultState={getAddResultState}
                triggerVariant="icon"
                triggerIcon={Plus}
                triggerLabel={tCompare("addLens")}
                triggerClassName="h-9 w-9 shrink-0 rounded-xl"
              />
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
