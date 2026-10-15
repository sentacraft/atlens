"use client";

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  filterLenses,
  sortLenses,
  selectByUsage,
  getAvailableFilterOptions,
  defaultFilters,
  MAX_COMPARE,
  type FilterState,
} from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";
import { serializeFilters, parseFilters, FILTER_PARAM_KEYS } from "@/lib/url/filter-params";
import { projectToUrl } from "@/lib/url/projection";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import BackToTopButton from "@/components/nav/BackToTopButton";
import LensCard from "@/components/lens/LensCard";
import LensFilters from "@/components/lens-filters/LensFilters";
import LensIndexShell from "@/components/browse/LensIndexShell";
import LensUsageSwitch from "@/components/browse/LensUsageSwitch";
import LensSortControl from "@/components/browse/LensSortControl";
import LensSearchDialog, { suggestLensFooter } from "@/components/browse/LensSearchDialog";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEARCH_TRIGGER_CLS } from "@/config/ui-tokens";
import { mountToUrlSegment } from "@/lib/mount";

interface LensListClientProps {
  lenses: Lens[];
}

export default function LensListClient({ lenses }: LensListClientProps) {
  const t = useTranslations("LensList");
  const tSearch = useTranslations("Search");
  const hookAttr = useUiHookAttr();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => parseFilters(searchParams));
  const [searchOpen, setSearchOpen] = useState(false);
  const { compareIds, toggle } = useCompare();
  const gridRef = useRef<HTMLDivElement>(null);

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

  const activeFilterCount = [
    filters.brands.length > 0,
    filters.typeFilter !== null,
    filters.focusFilter !== null,
    filters.opticalTrait !== null,
    filters.focusMotorClass !== null,
    filters.focalCategories.length > 0,
    filters.features.length > 0,
  ].filter(Boolean).length;

  function handleSelectLens(lens: Lens) {
    setSearchOpen(false);
    router.push(`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`);
  }

  function clearAllFilters() {
    setFilters((current) => ({ ...defaultFilters, usage: current.usage }));
  }

  useEffect(() => {
    projectToUrl((url) => {
      // A string, not URLSearchParams, so commas stay unencoded (as in CompareUrlSync).
      FILTER_PARAM_KEYS.forEach((k) => url.searchParams.delete(k));
      const rest = url.searchParams.toString();
      const mine = serializeFilters(filters).toString().replace(/%2C/g, ",");
      url.search = [rest, mine].filter(Boolean).join("&");
    });
  }, [filters]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    grid.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      easing: "ease-out",
    });
  }, [displayed]);

  return (
    <>
      <LensIndexShell
        navRightSlot={
          <LensUsageSwitch
            value={filters.usage}
            onChange={(usage) =>
              setFilters((current) => ({
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
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
            onReset={clearAllFilters}
            searchSlot={
              <>
                <button type="button" onClick={() => setSearchOpen(true)} className={cn(SEARCH_TRIGGER_CLS, "sm:h-10")}>
                  <Search className="h-4 w-4" />
                  {tSearch("browseTrigger")}
                </button>
                <LensSearchDialog
                  open={searchOpen}
                  onOpenChange={setSearchOpen}
                  lenses={lenses}
                  title={tSearch("title")}
                  resultAction={() => ({ label: tSearch("view") })}
                  onSelect={handleSelectLens}
                  footer={suggestLensFooter}
                />
              </>
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
                setFilters((current) => ({ ...current, sort }))
              }
              onToggleDir={() =>
                setFilters((current) => ({
                  ...current,
                  sortDir: current.sortDir === "asc" ? "desc" : "asc",
                }))
              }
            />
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="flex flex-col gap-2 animate-in fade-in duration-200">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("noResults")}
            </p>
          </div>
        ) : (
          // No content key: remounting would defeat memo(LensCard); the fade is replayed imperatively.
          <div
            ref={gridRef}
            {...hookAttr("grid")}
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
          </div>
        )}
      </LensIndexShell>

      <BackToTopButton />
    </>
  );
}
