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
  type SortKey,
} from "@/lib/lens";
import { serializeFilters, parseFilters } from "@/lib/filter-params";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import { useLensesApi } from "@/hooks/useLensesApi";
import { ArrowDownWideNarrow, ArrowUp, ArrowDown } from "lucide-react";
import BackToTopButton from "@/components/BackToTopButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LensCard from "./LensCard";
import LensFilters from "./LensFilters";
import LensSectionNav from "./LensSectionNav";
import { LENS_INDEX_SHELL_CLS } from "@/lib/ui-tokens";
import LensSearchDialog from "./LensSearchDialog";
import LensesLoading from "@/app/[locale]/lenses/[mount]/(browse)/loading";
import FeedbackTrigger from "./FeedbackTrigger";

export default function LensListClient() {
  const t = useTranslations("LensList");
  const tSearch = useTranslations("Search");
  const hookAttr = useUiHookAttr();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [filters, setFilters] = useState<FilterState>(() => parseFilters(searchParams));
  const { compareIds, toggle } = useCompare();

  const { lenses, brands, availableOpticalTraits, isLoading } = useLensesApi();

  const displayed = useMemo(
    () =>
      sortLenses(filterLenses(lenses, filters), filters.sort, filters.sortDir),
    [lenses, filters]
  );

  if (isLoading && lenses.length === 0) {
    return <LensesLoading />;
  }

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.typeFilter !== null ||
    filters.focusFilter !== null ||
    filters.usage !== defaultFilters.usage ||
    filters.opticalTrait !== null ||
    filters.focusMotorClass !== null ||
    filters.focalCategories.length > 0 ||
    filters.features.length > 0;

  const activeFilterCount = [
    filters.brands.length > 0,
    filters.typeFilter !== null,
    filters.focusFilter !== null,
    filters.usage !== defaultFilters.usage,
    filters.opticalTrait !== null,
    filters.focusMotorClass !== null,
    filters.focalCategories.length > 0,
    filters.features.length > 0,
  ].filter(Boolean).length;

  const sortOptions = [
    { value: "focalLength", label: t("sortFocalLength") },
    { value: "maxAperture", label: t("sortAperture") },
    { value: "weightG", label: t("sortWeight") },
  ] as const satisfies readonly { value: SortKey; label: string }[];

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LensSectionNav />
            <LensSearchDialog
              triggerVariant="button"
              triggerLabel={tSearch("browseTrigger")}
              triggerClassName="sm:h-10"
            />
          </div>
          <LensFilters
            filters={filters}
            brands={brands}
            availableOpticalTraits={availableOpticalTraits}
            onFiltersChange={updateFilters}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            onReset={clearAllFilters}
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

            <div className="inline-flex h-9 items-stretch overflow-hidden rounded-xl border border-zinc-200/70 bg-white/80 shadow-sm shadow-zinc-950/[0.02] dark:border-zinc-800 dark:bg-zinc-900/30">
              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  updateFilters((current) => ({
                    ...current,
                    sort: (value ?? "focalLength") as SortKey,
                  }))
                }
                items={sortOptions.map((option) => ({ ...option }))}
              >
                <SelectTrigger
                  id="results-sort"
                  className="h-full data-[size=default]:h-full gap-2 rounded-none border-0 bg-transparent py-0 px-3 text-[12px] shadow-none hover:bg-zinc-50/50 data-[popup-open]:bg-zinc-100 dark:hover:bg-zinc-800/30 dark:data-[popup-open]:bg-zinc-800/50 sm:text-[13px]"
                >
                  <ArrowDownWideNarrow className="size-3.5 shrink-0 text-zinc-900 dark:text-zinc-100" />
                  <SelectValue placeholder={t("sortFocalLength")} />
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignOffset={-40}
                  sideOffset={5}
                  className="w-[calc(var(--anchor-width)+40px)] min-w-0 overflow-hidden rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
                >
                  {sortOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg py-2 sm:py-2 text-[12px] text-zinc-500 dark:text-zinc-400 data-[selected]:text-zinc-900 dark:data-[selected]:text-zinc-50"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px self-stretch bg-zinc-200 dark:bg-zinc-800" />
              <button
                type="button"
                className="inline-flex items-center px-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                onClick={() =>
                  updateFilters((current) => ({
                    ...current,
                    sortDir: current.sortDir === "asc" ? "desc" : "asc",
                  }))
                }
                aria-label={
                  filters.sortDir === "asc" ? t("sortAsc") : t("sortDesc")
                }
              >
                {filters.sortDir === "asc" ? (
                  <ArrowUp className="size-3.5" />
                ) : (
                  <ArrowDown className="size-3.5" />
                )}
              </button>
            </div>
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
                <FeedbackTrigger
                  type="general"
                  className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
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
