"use client";

import { useMemo, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { getLensesByMount } from "@/lib/lens";
import { useMountedCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { spring } from "@/lib/animation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS } from "@/lib/ui-tokens";
import { Z } from "@/config/ui";
import { lensDisplayName, lensSubtitleLine } from "@/lib/lens.format";

export default function CompareBar() {
  const t = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const tCompare = useTranslations("Compare");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const mount = useEffectiveMount();
  const { compareIds, toggleCompare, clearCompare } = useMountedCompare();

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
          `${entry.contentRect.height}px`
        );
      });
      observerRef.current.observe(el);
    } else {
      document.documentElement.style.setProperty("--compare-bar-height", "0px");
    }
  }, []);

  // Extract lens ID if currently on a lens detail page (/lenses/[mount]/[id])
  const currentLensId = useMemo(() => {
    const seg = mountToUrlSegment(mount);
    const match = pathname.match(new RegExp(`\\/lenses\\/${seg}\\/(?!compare\\b)([^/]+)$`));
    return match?.[1] ?? null;
  }, [pathname, mount]);

  function handleCompare() {
    const ids = selectedLenses.map((l) => l.id).join(",");
    const seg = mountToUrlSegment(mount);
    const fromParam = currentLensId ? `&from=lens&lensId=${currentLensId}` : "";
    router.push(`/lenses/${seg}/compare?ids=${ids}${fromParam}`);
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
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)] sm:[mask-image:none]">
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
                        onClick={() => { toggleCompare(lens.id); toast(t("removedFromCompare")); }}
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
            <div className="flex items-center justify-end gap-3 sm:shrink-0">
              <button
                onClick={() => { clearCompare(); toast(t("clearedCompare")); }}
                className="shrink-0 text-sm font-medium px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {t("clearCompare")}
              </button>
              <button
                onClick={handleCompare}
                className={`shrink-0 text-sm font-medium px-4 py-2 rounded-xl ${ACTION_PRIMARY_CLS}`}
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
