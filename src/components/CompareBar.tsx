"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { allLenses } from "@/lib/lens";
import { useCompare } from "@/context/CompareProvider";
import { motion, AnimatePresence } from "motion/react";
import { spring } from "@/lib/animation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS } from "@/lib/ui-tokens";
import { Z } from "@/config/ui";

export default function CompareBar() {
  const t = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const tCompare = useTranslations("Compare");
  const router = useRouter();
  const pathname = usePathname();
  const { compareIds, toggleCompare, clearCompare } = useCompare();

  const selectedLenses = useMemo(
    () =>
      compareIds
        .map((id) => allLenses.find((l) => l.id === id))
        .filter((lens) => lens !== undefined),
    [compareIds]
  );

  // Extract lens ID if currently on a lens detail page (/lenses/[id])
  const currentLensId = useMemo(() => {
    const match = pathname.match(/\/lenses\/(?!compare\b)([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  function handleCompare() {
    const ids = selectedLenses.map((l) => l.id).join(",");
    const fromParam = currentLensId ? `&from=lens&lensId=${currentLensId}` : "";
    router.push(`/lenses/compare?ids=${ids}${fromParam}`);
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
          data-testid="compare-bar"
          className={`fixed bottom-0 left-0 right-0 ${Z.fixed} border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-sm pb-[var(--safe-inset-bottom)]`}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0">
              <AnimatePresence mode="popLayout">
                {selectedLenses.map((lens) => {
                  const brandName = tBrand(lens.brand);
                  const displayName = `${brandName} ${lens.model}`;

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
                          {brandName}
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
            <div className="flex items-center justify-end gap-3 sm:shrink-0">
              <button
                onClick={clearCompare}
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
