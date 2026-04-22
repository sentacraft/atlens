"use client";

import { useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import type { Lens } from "@/lib/types";
import {
  filterLenses,
  sortLenses,
  defaultFilters,
  getUniqueBrands,
  type FilterState,
  type SortKey,
  type SpecialtyTag,
} from "@/lib/lens";
import { serializeFilters, parseFilters } from "@/lib/filter-params";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import { Z } from "@/config/ui";
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
  const hookAttr = useUiHookAttr();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [filters, setFilters] = useState<FilterState>(() => parseFilters(searchParams));
  const { compareIds, toggleCompare, canToggle } = useCompare();

  const brands = useMemo(() => getUniqueBrands(lenses), [lenses]);

  const availableSpecialtyTags = useMemo(
    () =>
      [...new Set(lenses.flatMap((l) => l.specialtyTags ?? []))] as SpecialtyTag[],
    [lenses]
  );

  const displayed = useMemo(
    () =>
      sortLenses(filterLenses(lenses, filters), filters.sort, filters.sortDir),
    [lenses, filters]
  );

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.typeFilter !== null ||
    filters.specialtyTag !== null ||
    filters.focusMotorClass !== null ||
    filters.focalCategories.length > 0 ||
    filters.features.length > 0;

  const sortOptions = [
    { value: "focalLength", label: t("sortFocalLength") },
    { value: "maxAperture", label: t("sortAperture") },
    { value: "weightG", label: t("sortWeight") },
  ] as const satisfies readonly { value: SortKey; label: string }[];

  function updateFilters(updater: FilterState | ((prev: FilterState) => FilterState)) {
    setFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const qs = serializeFilters(next).toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }, 300);
      return next;
    });
  }

  function clearAllFilters() {
    updateFilters(defaultFilters);
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-4 sm:pt-8 pb-24 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {t("title")}
            </h1>
            <LensSearchDialog triggerVariant="icon" />
          </div>
          <LensFilters
            filters={filters}
            brands={brands}
            availableSpecialtyTags={availableSpecialtyTags}
            onFiltersChange={updateFilters}
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <p className="whitespace-nowrap">{t("resultsCount", { count: displayed.length })}</p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-900 hover:decoration-zinc-500 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100 dark:hover:decoration-zinc-400"
                    onClick={clearAllFilters}
                  >
                    {t("clearFilters")}
                  </button>
                ) : null}
              </div>

              <div className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-zinc-200/70 bg-white/80 p-0.75 shadow-sm shadow-zinc-950/[0.02] dark:border-zinc-800 dark:bg-zinc-900/30">
                <label
                  htmlFor="results-sort"
                  className="whitespace-nowrap pl-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
                >
                  {t("sortBy")}
                </label>
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
                    size="sm"
                    hideChevronOnMobile
                    className="rounded-full border-transparent bg-transparent px-2.5 text-[12px] shadow-none dark:bg-transparent sm:min-w-[7.75rem]"
                  >
                    <SelectValue placeholder={t("sortFocalLength")} />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false}>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full border-zinc-200/80 bg-zinc-50/80 px-2 dark:border-zinc-700 dark:bg-zinc-800/70"
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
                  type="missing_lens"
                  className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {t("suggestLensLink")}
                </FeedbackTrigger>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={displayed.map((l) => l.id).join()}
              {...hookAttr("grid")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {displayed.map((lens, i) => (
                <LensCard
                  key={lens.id}
                  lens={lens}
                  isSelected={compareIds.includes(lens.id)}
                  selectionDisabled={!canToggle(lens.id)}
                  onToggle={() => toggleCompare(lens.id)}
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
