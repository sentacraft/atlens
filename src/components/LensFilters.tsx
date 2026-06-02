"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { FOCAL_CATEGORIES } from "@/lib/lens";
import type { AvailableFilterOptions, FilterState, FocusFilter, FocusMotorClass, LensType } from "@/lib/lens";
import type { OpticalTrait } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TEXT_LINK_CLS } from "@/lib/ui-tokens";
import BrandFilterMenu from "./lens-filters/BrandFilterMenu";
import FeatureToggleGroup from "./lens-filters/FeatureToggleGroup";
import FilterRow from "./lens-filters/FilterRow";
import MultiSelectChipGroup from "./lens-filters/MultiSelectChipGroup";
import TypeSegmentedControl from "./lens-filters/TypeSegmentedControl";
import { miniLabelClass, rowLabelClass } from "./lens-filters/styles";
import { useFiltersTelemetry } from "./LensFilters.telemetry";

interface Props {
  filters: FilterState;
  /** Option values present in the current scope; every control narrows to these. */
  available: AvailableFilterOptions;
  onFiltersChange: (filters: FilterState) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onReset: () => void;
  /** Rendered at the right edge of the brand row (e.g. the lens search trigger). */
  searchSlot?: ReactNode;
}

export default function LensFilters({
  filters,
  available,
  onFiltersChange,
  hasActiveFilters,
  activeFilterCount,
  onReset,
  searchSlot,
}: Props) {
  const t = useTranslations("LensList");
  const tBadge = useTranslations("SpecialtyBadge");
  const tBrand = useTranslations("Brands");
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const BRAND_PREVIEW_LIMIT = 2;
  const brandJoiner = t("brandSeparator");
  const brandNames = Object.fromEntries(available.brands.map((b) => [b, tBrand(b)]));
  const selectedBrandNames = filters.brands.map((b) => brandNames[b] ?? b);
  const brandTriggerLabel =
    selectedBrandNames.length === 0
      ? t("brand")
      : selectedBrandNames.length <= BRAND_PREVIEW_LIMIT
        ? t("brandTriggerLabel", { names: selectedBrandNames.join(brandJoiner) })
        : t("brandTriggerLabelMore", {
            names: selectedBrandNames.slice(0, BRAND_PREVIEW_LIMIT).join(brandJoiner),
            extra: selectedBrandNames.length - BRAND_PREVIEW_LIMIT,
          });

  useFiltersTelemetry(filters);

  const featureMeta = {
    ois: { label: t("featureOis"), icon: FEATURE_ICONS.ois },
    wr: { label: t("featureWr"), icon: FEATURE_ICONS.wr },
    apertureRing: { label: t("featureApertureRing"), icon: FEATURE_ICONS.apertureRing },
    powerZoom: { label: t("featurePowerZoom"), icon: FEATURE_ICONS.powerZoom },
  } as const;

  function updateFilters<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function toggleValue<T extends string>(values: T[], value: T) {
    return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  }

  function toggleMultiFilter<T extends string>(
    currentValues: T[],
    value: T,
    allValues: readonly T[],
  ) {
    const next = toggleValue(currentValues, value);
    return next.length === 0 || next.length === allValues.length ? [] : next;
  }

  // Label maps keyed by value, so option lists can be built by narrowing the
  // scope-available values to those actually present (rather than hardcoding
  // the full set and leaving dead choices behind).
  const motorLabels: Record<FocusMotorClass, string> = {
    linear: t("motorLinear"),
    stepping: t("motorStepping"),
    dc: t("motorDc"),
    other: t("motorOther"),
  };
  const focusLabels: Record<FocusFilter, string> = {
    auto: t("focusAuto"),
    manual: t("focusManual"),
  };
  const mobileFocusLabels: Record<FocusFilter, string> = {
    auto: t("focusAutoMobile"),
    manual: t("focusManualMobile"),
  };

  const typeOptions = [
    { value: null, label: t("allTypes") },
    ...available.types.map((type) => ({
      value: type,
      label: t(type === "prime" ? "primes" : "zooms"),
    })),
  ] as { value: LensType | null; label: string }[];

  const opticalTraitOptions = [
    { value: null as OpticalTrait | null, label: t("allTypes") },
    ...available.opticalTraits.map((trait) => ({
      value: trait as OpticalTrait | null,
      label: tBadge(trait),
    })),
  ];

  const focusMotorOptions = [
    { value: null, label: t("allTypes") },
    ...available.focusMotorClasses.map((motor) => ({ value: motor, label: motorLabels[motor] })),
  ] as { value: FocusMotorClass | null; label: string }[];

  const focusOptions = [
    { value: null, label: t("allTypes") },
    ...available.focusModes.map((mode) => ({ value: mode, label: focusLabels[mode] })),
  ] as { value: FocusFilter | null; label: string }[];

  const mobileTypeOptions = [
    { value: null, label: t("allTypes") },
    ...available.types.map((type) => ({
      value: type,
      label: t(type === "prime" ? "primesMobile" : "zoomsMobile"),
    })),
  ] as { value: LensType | null; label: string }[];

  const mobileFocusOptions = [
    { value: null, label: t("allTypes") },
    ...available.focusModes.map((mode) => ({ value: mode, label: mobileFocusLabels[mode] })),
  ] as { value: FocusFilter | null; label: string }[];

  const moreFiltersCount =
    (filters.focalCategories.length > 0 ? 1 : 0) +
    (filters.features.length > 0 ? 1 : 0) +
    (filters.opticalTrait !== null ? 1 : 0) +
    (filters.focusMotorClass !== null ? 1 : 0);

  const allOptionLabel = t("allTypes");

  const brandOptions = available.brands.map((brand) => ({
    key: brand,
    label: tBrand(brand),
    selected: filters.brands.includes(brand),
    onClick: () =>
      updateFilters("brands", toggleMultiFilter(filters.brands, brand, available.brands)),
  }));

  const focalOptions = FOCAL_CATEGORIES.filter((category) =>
    available.focalCategories.includes(category.key),
  ).map((category) => ({
    key: category.key,
    label: t(`category-${category.key}`),
    hint: t(`category-${category.key}Hint`),
    selected: filters.focalCategories.includes(category.key),
    onClick: () =>
      updateFilters(
        "focalCategories",
        toggleMultiFilter(
          filters.focalCategories,
          category.key,
          available.focalCategories,
        ),
      ),
  }));

  const featureOptions = available.features.map((key) => ({
    key,
    label: featureMeta[key].label,
    icon: featureMeta[key].icon,
    selected: filters.features.includes(key),
    onClick: () => updateFilters("features", toggleValue(filters.features, key)),
  }));

  const filtersToggle = (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] sm:min-h-0",
        "text-zinc-700 transition-colors hover:text-zinc-900",
        "dark:text-zinc-300 dark:hover:text-zinc-100",
      )}
      onClick={() => setSecondaryOpen((v) => !v)}
      aria-expanded={secondaryOpen}
    >
      <SlidersHorizontal className="size-3.5" />
      <span className={TEXT_LINK_CLS}>
        {secondaryOpen ? t("fewerFilters") : t("moreFilters")}
      </span>
      <ChevronDown
        className={cn(
          "size-3.5 transition-transform duration-200",
          secondaryOpen && "rotate-180",
        )}
      />
      {moreFiltersCount > 0 && !secondaryOpen && (
        <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-full bg-zinc-900 font-mono text-[9px] font-bold leading-none text-white dark:bg-zinc-100 dark:text-zinc-900">
          {moreFiltersCount}
        </span>
      )}
    </button>
  );

  const filtersMetaRow = (
    <div className="inline-flex items-center gap-2 sm:gap-4">
      {filtersToggle}
      {hasActiveFilters && (
        <>
          <span className="text-[12px] text-zinc-300 dark:text-zinc-600">·</span>
          <button
            type="button"
            onClick={onReset}
            aria-label={t("reset")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-rose-800 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
          >
            <span className="inline-flex items-center gap-1.5 underline underline-offset-4 decoration-rose-200 dark:decoration-rose-800">
              <RotateCcw size={11} />
              {t("reset")}
            </span>
            <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-full bg-rose-800 font-mono text-[9px] font-bold leading-none text-white dark:bg-rose-700">
              {activeFilterCount}
            </span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Primary filters: always visible on all viewports */}
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Brand row carries the search trigger on its right edge so search
            shares a line with the first filter instead of taking its own. The
            brand control itself swaps between a dropdown (mobile) and a chip
            group (desktop); search renders once, outside that swap. */}
        <div className="flex items-center gap-2 sm:items-start sm:gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="sm:hidden">
              <BrandFilterMenu
                brands={available.brands}
                selected={filters.brands}
                brandLabels={brandNames}
                allLabel={allOptionLabel}
                triggerLabel={brandTriggerLabel}
                onToggle={(brand) =>
                  updateFilters("brands", toggleMultiFilter(filters.brands, brand, available.brands))
                }
                onClear={() => updateFilters("brands", [])}
              />
            </div>
            <div className="hidden sm:flex sm:items-start sm:gap-2.5">
              <span className={rowLabelClass}>{t("brand")}</span>
              <div className="min-w-0 flex-1">
                <MultiSelectChipGroup
                  allLabel={allOptionLabel}
                  allSelected={filters.brands.length === 0}
                  onSelectAll={() => updateFilters("brands", [])}
                  options={brandOptions}
                />
              </div>
            </div>
          </div>
          <div className="shrink-0">{searchSlot}</div>
        </div>

        <div className="flex gap-2 sm:hidden">
          <div className="min-w-0 flex-1">
            <span className={miniLabelClass}>{t("lensType")}</span>
            <TypeSegmentedControl
              ariaLabel={t("lensType")}
              options={mobileTypeOptions}
              value={filters.typeFilter}
              onChange={(v) => updateFilters("typeFilter", v)}
              compact
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className={miniLabelClass}>{t("focusFilter")}</span>
            <TypeSegmentedControl
              ariaLabel={t("focusFilter")}
              options={mobileFocusOptions}
              value={filters.focusFilter}
              onChange={(v) => updateFilters("focusFilter", v)}
              compact
            />
          </div>
        </div>
        <div className="hidden sm:block">
          <FilterRow label={t("lensType")}>
            <TypeSegmentedControl
              ariaLabel={t("lensType")}
              options={typeOptions}
              value={filters.typeFilter}
              onChange={(v) => updateFilters("typeFilter", v)}
            />
          </FilterRow>
        </div>
        <div className="hidden sm:block">
          <FilterRow label={t("focusFilter")}>
            <TypeSegmentedControl
              ariaLabel={t("focusFilter")}
              options={focusOptions}
              value={filters.focusFilter}
              onChange={(v) => updateFilters("focusFilter", v)}
            />
          </FilterRow>
        </div>

        <div className="sm:my-1.5">{filtersMetaRow}</div>
      </div>

      {/* Secondary filters: collapsed on mobile by default, always open on desktop */}
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-500 ease-in-out",
          secondaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3.5 pt-3 pb-1 sm:gap-3">
            {available.focalCategories.length > 0 && (
              <FilterRow label={t("focalRange")}>
                <MultiSelectChipGroup
                  allLabel={allOptionLabel}
                  allSelected={filters.focalCategories.length === 0}
                  onSelectAll={() => updateFilters("focalCategories", [])}
                  options={focalOptions}
                />
              </FilterRow>
            )}

            {available.features.length > 0 && (
              <FilterRow label={t("features")}>
                <FeatureToggleGroup options={featureOptions} />
              </FilterRow>
            )}

            {available.opticalTraits.length > 0 && (
              <FilterRow label={t("opticalTraitFilter")}>
                <TypeSegmentedControl
                  ariaLabel={t("opticalTraitFilter")}
                  options={opticalTraitOptions}
                  value={filters.opticalTrait}
                  onChange={(v) => updateFilters("opticalTrait", v)}
                  wrap
                  mobileLabelOverrides={{
                    tilt: "Tilt",
                    shift: "Shift",
                  }}
                />
              </FilterRow>
            )}

            {available.focusMotorClasses.length > 0 && (
              <FilterRow label={t("focusMotorFilter")}>
                <TypeSegmentedControl
                  ariaLabel={t("focusMotorFilter")}
                  options={focusMotorOptions}
                  value={filters.focusMotorClass}
                  onChange={(v) => updateFilters("focusMotorClass", v)}
                  wrap
                  mobileLabelOverrides={{
                    linear: t("motorLinearMobile"),
                    stepping: t("motorSteppingMobile"),
                    dc: t("motorDcMobile"),
                  }}
                />
              </FilterRow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
