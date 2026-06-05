"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import {
  filterLenses,
  sortLenses,
  selectByUsage,
  getAvailableFilterOptions,
  defaultFilters,
  MAX_COMPARE,
  type FilterState,
} from "@/lib/lens";
import type { Lens } from "@/lib/types";
import { serializeFilters, parseFilters } from "@/lib/filter-params";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import BackToTopButton from "@/components/BackToTopButton";
import LensCard from "./LensCard";
import LensFilters from "./LensFilters";
import LensIndexShell from "./LensIndexShell";
import LensUsageSwitch from "./LensUsageSwitch";
import LensSortControl from "./LensSortControl";
import LensSearchDialog from "./LensSearchDialog";
import FeedbackTrigger from "./FeedbackTrigger";

interface LensListClientProps {
  lenses: Lens[];
}

export default function LensListClient({ lenses }: LensListClientProps) {
  const t = useTranslations("LensList");
  const tSearch = useTranslations("Search");
  const hookAttr = useUiHookAttr();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [filters, setFilters] = useState<FilterState>(() => parseFilters(searchParams));
  const { compareIds, toggle } = useCompare();

  // Every filter control narrows to the current photo/cine view, so a Cine
  // view never offers a brand, feature, or focus-motor option that has no cine
  // lenses behind it. Derived from the already-in-memory lenses, so this costs
  // a memo, not a fetch.
  const scopedLenses = useMemo(
    () => selectByUsage(lenses, filters.usage),
    [lenses, filters.usage],
  );
  const available = useMemo(() => getAvailableFilterOptions(scopedLenses), [scopedLenses]);

  const displayed = useMemo(
    () =>
      sortLenses(filterLenses(lenses, filters), filters.sort, filters.sortDir),
    [lenses, filters]
  );

  // `usage` (photo/cine) is a view mode, not a filter dimension, so it is left
  // out of the active-filter count and the reset trigger. Reset still returns
  // usage to its default via defaultFilters below.
  const activeFilterCount = [
    filters.brands.length > 0,
    filters.typeFilter !== null,
    filters.focusFilter !== null,
    filters.opticalTrait !== null,
    filters.focusMotorClass !== null,
    filters.focalCategories.length > 0,
    filters.features.length > 0,
  ].filter(Boolean).length;

  function updateFilters(updater: FilterState | ((prev: FilterState) => FilterState)) {
    const next = typeof updater === "function" ? updater(filters) : updater;
    setFilters(next);
    const qs = serializeFilters(next).toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    window.history.replaceState(null, "", path);
  }

  function clearAllFilters() {
    // Reset clears refinements but preserves the photo/cine view mode — usage
    // is a view partition, not a filter, so leaving the current view intact
    // mirrors how switching tabs would not reset the user's filters.
    updateFilters((current) => ({ ...defaultFilters, usage: current.usage }));
  }

  return (
    <>
      <LensIndexShell
        navRightSlot={
          <LensUsageSwitch
            value={filters.usage}
            onChange={(usage) =>
              // Switching the photo/cine view enters a different scope, so it
              // resets refinements to a clean slate — only the chosen sort
              // order carries over. This also sidesteps stale brand selections
              // that no longer exist in the new view.
              updateFilters((current) => ({
                ...defaultFilters,
                usage,
                sort: current.sort,
                sortDir: current.sortDir,
              }))
            }
          />
        }
        className="pb-[max(6rem,calc(var(--compare-bar-height,0px)+2rem))]"
      >
        <div className="pt-4">
          <LensFilters
            filters={filters}
            available={available}
            onFiltersChange={updateFilters}
            activeFilterCount={activeFilterCount}
            onReset={clearAllFilters}
            // Search shares the brand row's right edge — it scopes the lens
            // list, so it belongs in the refine zone, not the navigation bar.
            searchSlot={
              <LensSearchDialog
                lenses={lenses}
                triggerVariant="button"
                triggerLabel={tSearch("browseTrigger")}
                triggerClassName="sm:h-10"
              />
            }
          />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800/50 mt-4 pt-4 mb-2 sm:mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5">
              <p className="whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                {t.rich("resultsCount", {
                  count: displayed.length,
                  b: (chunks) => (
                    <strong className="font-medium text-zinc-700 dark:text-zinc-300">
                      {chunks}
                    </strong>
                  ),
                })}
              </p>
              {/* Coverage is otherwise buried in About; surfacing it next to the
                  count puts it where users form the "is this complete?" judgment,
                  not only on the dead-end empty state. */}
              <Link
                href="/about#coverage"
                className="whitespace-nowrap text-xs text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                {t("coverageLink")}
              </Link>
            </div>

            <LensSortControl
              sort={filters.sort}
              sortDir={filters.sortDir}
              onSortChange={(sort) =>
                updateFilters((current) => ({ ...current, sort }))
              }
              onToggleDir={() =>
                updateFilters((current) => ({
                  ...current,
                  sortDir: current.sortDir === "asc" ? "desc" : "asc",
                }))
              }
            />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {displayed.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("noResults")}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {t("suggestLens")}{" "}
                <FeedbackTrigger type="general">
                  {t("suggestLensLink")}
                </FeedbackTrigger>
                <span className="mx-2 opacity-40">·</span>
                <Link
                  href="/about#coverage"
                  className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {t("coverageLink")}
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={displayed.map((l) => l.id).join()}
              {...hookAttr("grid")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            >
              {displayed.map((lens, i) => (
                <LensCard
                  key={lens.id}
                  lens={lens}
                  isSelected={compareIds.includes(lens.id)}
                  selectionDisabled={
                    !compareIds.includes(lens.id) &&
                    compareIds.length >= MAX_COMPARE
                  }
                  onToggle={toggle}
                  priority={i < 8}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </LensIndexShell>

      <BackToTopButton />
    </>
  );
}
