"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import type { Lens } from "@/lib/types";
import { TEXT_LINK_CLS } from "@/lib/ui-tokens";
import {
  filterLenses,
  sortLenses,
  defaultFilters,
  getOrderedUniqueBrands,
  MAX_COMPARE,
  type FilterState,
  type SortKey,
} from "@/lib/lens";
import { deriveSpecialty } from "@/lib/lens-specialty";
import { OPTICAL_TRAITS, type OpticalTrait } from "@/lib/types";
import { serializeFilters, parseFilters } from "@/lib/filter-params";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import BackToTopButton from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LensCard from "./LensCard";
import LensFilters from "./LensFilters";
import LensSearchDialog from "./LensSearchDialog";
import FeedbackTrigger from "./FeedbackTrigger";

interface Props {
  lenses: Lens[];
}

export default function LensListClient({ lenses }: Props) {
  const t = useTranslations("LensList");
  const tSearch = useTranslations("Search");
  const hookAttr = useUiHookAttr();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterState>(() => parseFilters(searchParams));
  const { compareIds, toggle } = useCompare();
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  const stableToggle = useCallback((id: string) => toggleRef.current(id), []);

  const brands = useMemo(() => getOrderedUniqueBrands(lenses), [lenses]);

  const availableOpticalTraits = useMemo<OpticalTrait[]>(
    () => {
      const present = new Set(
        lenses.flatMap((l) => deriveSpecialty(l).opticalTraits),
      );
      return OPTICAL_TRAITS.filter((trait) => present.has(trait));
    },
    [lenses],
  );

  const displayed = useMemo(
    () =>
      sortLenses(filterLenses(lenses, filters), filters.sort, filters.sortDir),
    [lenses, filters]
  );

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.typeFilter !== null ||
    filters.focusFilter !== null ||
    filters.usage !== defaultFilters.usage ||
    filters.opticalTrait !== null ||
    filters.focusMotorClass !== null ||
    filters.focalCategories.length > 0 ||
    filters.features.length > 0;

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
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-4 sm:pt-8 pb-[max(6rem,calc(var(--compare-bar-height,0px)+2rem))] flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {t("title")}
            </h2>
            <LensSearchDialog triggerVariant="button" triggerLabel={tSearch("browseTrigger")} />
          </div>
          <LensFilters
            filters={filters}
            brands={brands}
            availableOpticalTraits={availableOpticalTraits}
            onFiltersChange={updateFilters}
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <p className="whitespace-nowrap">{t("resultsCount", { count: displayed.length })}</p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.08em] ${TEXT_LINK_CLS}`}
                    onClick={clearAllFilters}
                  >
                    {t("clearFilters")}
                  </button>
                ) : null}
              </div>

              <div className="ml-auto inline-flex items-center gap-2">
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
                    hideChevronOnMobile
                    className="justify-start gap-2 rounded-xl border-zinc-200/70 bg-white/80 px-3 text-[12px] shadow-sm shadow-zinc-950/[0.02] data-[size=default]:h-9 dark:border-zinc-800 dark:bg-zinc-900/30 sm:min-w-[12rem]"
                  >
                    <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                      {t("sortBy")}
                    </span>
                    <SelectValue placeholder={t("sortFocalLength")} />
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    className="overflow-hidden rounded-xl"
                  >
                    {sortOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="rounded-none py-2 sm:py-2 text-[12px] text-zinc-500 dark:text-zinc-400 data-[selected]:text-zinc-900 dark:data-[selected]:text-zinc-50"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-zinc-200/70 bg-white/80 px-2.5 shadow-sm shadow-zinc-950/[0.02] dark:border-zinc-800 dark:bg-zinc-900/30"
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
                    <ArrowUpNarrowWide />
                  ) : (
                    <ArrowDownNarrowWide />
                  )}
                </Button>
              </div>
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
                  onToggle={stableToggle}
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
