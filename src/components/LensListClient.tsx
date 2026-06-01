"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import {
  filterLenses,
  sortLenses,
  defaultFilters,
  MAX_COMPARE,
  type FilterState,
} from "@/lib/lens";
import type { Lens, OpticalTrait } from "@/lib/types";
import { serializeFilters, parseFilters } from "@/lib/filter-params";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import BackToTopButton from "@/components/BackToTopButton";
import LensCard from "./LensCard";
import LensFilters from "./LensFilters";
import LensSectionNav from "./LensSectionNav";
import LensSortControl from "./LensSortControl";
import { LENS_INDEX_SHELL_CLS } from "@/lib/ui-tokens";
import LensSearchDialog from "./LensSearchDialog";
import FeedbackTrigger from "./FeedbackTrigger";

interface LensListClientProps {
  lenses: Lens[];
  brands: string[];
  availableOpticalTraits: OpticalTrait[];
}

export default function LensListClient({ lenses, brands, availableOpticalTraits }: LensListClientProps) {
  const t = useTranslations("LensList");
  const tSearch = useTranslations("Search");
  const hookAttr = useUiHookAttr();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [filters, setFilters] = useState<FilterState>(() => parseFilters(searchParams));
  const { compareIds, toggle } = useCompare();

  const displayed = useMemo(
    () =>
      sortLenses(filterLenses(lenses, filters), filters.sort, filters.sortDir),
    [lenses, filters]
  );

  // `usage` (photo/cine) is a view mode, not a filter dimension, so it is left
  // out of the active-filter count and the reset trigger. Reset still returns
  // usage to its default via defaultFilters below.
  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.typeFilter !== null ||
    filters.focusFilter !== null ||
    filters.opticalTrait !== null ||
    filters.focusMotorClass !== null ||
    filters.focalCategories.length > 0 ||
    filters.features.length > 0;

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
    updateFilters(defaultFilters);
  }

  return (
    <>
      <div className={`${LENS_INDEX_SHELL_CLS} flex flex-col pt-4 pb-[max(6rem,calc(var(--compare-bar-height,0px)+2rem))] sm:pt-8`}>
        <div className="flex flex-col gap-4">
          <LensSectionNav />
          <LensFilters
            filters={filters}
            brands={brands}
            availableOpticalTraits={availableOpticalTraits}
            onFiltersChange={updateFilters}
            hasActiveFilters={hasActiveFilters}
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
          <div className="flex items-center justify-between">
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
      </div>

      <BackToTopButton />
    </>
  );
}
