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
import LensSearchDialog from "@/components/browse/LensSearchDialog";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
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
  const { compareIds, toggle } = useCompare();
  const gridRef = useRef<HTMLDivElement>(null);

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

  function handleSelectLens(lens: Lens) {
    router.push(`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`);
  }

  function clearAllFilters() {
    // Reset clears refinements but preserves the photo/cine view mode — usage
    // is a view partition, not a filter, so leaving the current view intact
    // mirrors how switching tabs would not reset the user's filters.
    setFilters((current) => ({ ...defaultFilters, usage: current.usage }));
  }

  useEffect(() => {
    projectToUrl((url) => {
      // Own only the filter params; foreign params (utm, …) are left intact.
      // Assign url.search as a string (URLSearchParams would encode the commas
      // to %2C) so the comma-joined values stay raw, matching useCompareUrlSync.
      FILTER_PARAM_KEYS.forEach((k) => url.searchParams.delete(k));
      const rest = url.searchParams.toString();
      const mine = serializeFilters(filters).toString().replace(/%2C/g, ",");
      url.search = [rest, mine].filter(Boolean).join("&");
    });
  }, [filters]);

  // Replay a short fade on the (stable) grid whenever the result set changes,
  // without remounting it — so memo(LensCard) keeps bailing out unaffected
  // cards. 
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
              // Switching the photo/cine view enters a different scope, so it
              // resets refinements to a clean slate — only the chosen sort
              // order carries over. This also sidesteps stale brand selections
              // that no longer exist in the new view.
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
            // Search shares the brand row's right edge — it scopes the lens
            // list, so it belongs in the refine zone, not the navigation bar.
            searchSlot={
              <LensSearchDialog
                lenses={lenses}
                onSelectLens={handleSelectLens}
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
          </div>
        ) : (
          // Stable container — no content-fingerprint key. Filtering/sorting
          // reconciles cards in place instead of remounting the whole grid, so
          // memo(LensCard) bails out unaffected cards on every filter change
          // (previously the keyed remount defeated memo on that path). The fade
          // is replayed imperatively via the Web Animations API in the effect
          // above — no remount, so memo stays intact.
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
