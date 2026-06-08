"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import type { AvailableFilterOptions, FilterState, FocusFilter, FocusMotorClass, LensType } from "@/lib/lens";
import { OPTICAL_TRAITS, type OpticalTrait } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TEXT_LINK_CLS } from "@/lib/ui-tokens";
import BrandFilterMenu from "./lens-filters/BrandFilterMenu";
import FeatureToggleGroup from "./lens-filters/FeatureToggleGroup";
import FilterRow from "./lens-filters/FilterRow";
import MultiSelectChipGroup from "./lens-filters/MultiSelectChipGroup";
import TypeSegmentedControl, { type SegmentedLabel, type SegmentedOption } from "./lens-filters/TypeSegmentedControl";
import { rowLabelClass } from "./lens-filters/styles";
import { useFiltersTelemetry } from "./LensFilters.telemetry";

interface Props {
  filters: FilterState;
  /** Option values present in the current scope; every control narrows to these. */
  available: AvailableFilterOptions;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
  onReset: () => void;
  /** Rendered at the right edge of the brand row (e.g. the lens search trigger). */
  searchSlot?: ReactNode;
}

export default function LensFilters({
  filters,
  available,
  onFiltersChange,
  activeFilterCount,
  onReset,
  searchSlot,
}: Props) {
  const t = useTranslations("LensList");
  const tBadge = useTranslations("SpecialtyBadge");
  const tBrand = useTranslations("Brands");
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  useFiltersTelemetry(filters);

  // Each control below is its own block: derived values + option list + JSX
  // fragment, so everything one control needs reads top-to-bottom in one place.
  // The return at the end only assembles those fragments into the layout. Shared
  // helpers and the "all" label live up here since several controls reuse them.
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

  const allOptionLabel = t("allTypes");
  function buildSegmentedOptions<T extends string>(
    labels: Record<T, SegmentedLabel>,
    availableValues: readonly T[],
  ): SegmentedOption<T | null>[] {
    return [
      { value: null, label: { default: allOptionLabel } },
      ...(Object.keys(labels) as T[])
        .filter((value) => availableValues.includes(value))
        .map((value) => ({ value, label: labels[value] })),
    ];
  }

  // ── Brand ─────────────────────────────────────────────────────────────────────
  // The mobile dropdown lists up to BRAND_PREVIEW_LIMIT selected brand names; any
  // beyond that collapse into a separate "+N" badge (rendered outside the
  // truncating label in BrandFilterMenu) so the count is never clipped. Once a
  // brand is chosen the label drops the "Brand:" prefix — the filled pill plus its
  // position already read as the brand filter, and the names get the room.
  const BRAND_PREVIEW_LIMIT = 2;
  const brandJoiner = t("brandSeparator");
  const brandNames = Object.fromEntries(available.brands.map((b) => [b, tBrand(b)]));
  const selectedBrandNames = filters.brands.map((b) => brandNames[b] ?? b);
  const brandExtraCount = Math.max(0, selectedBrandNames.length - BRAND_PREVIEW_LIMIT);
  const brandTriggerLabel =
    selectedBrandNames.length === 0
      ? t("brand")
      : selectedBrandNames.slice(0, BRAND_PREVIEW_LIMIT).join(brandJoiner);
  const brandOptions = available.brands.map((brand) => ({
    key: brand,
    label: tBrand(brand),
  }));
  // The brand row carries the search trigger on its right edge so search shares a
  // line with the first filter. The brand control itself swaps between a dropdown
  // (mobile) and a chip group (desktop); search renders once, outside that swap.
  const brandRow = (
    <div className="flex items-center gap-2 sm:items-start sm:gap-2.5">
      <div className="min-w-0 flex-1">
        <div className="sm:hidden">
          <BrandFilterMenu
            brands={available.brands}
            selected={filters.brands}
            brandLabels={brandNames}
            allLabel={allOptionLabel}
            triggerLabel={brandTriggerLabel}
            extraCount={brandExtraCount}
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
              onSelectAll={() => updateFilters("brands", [])}
              options={brandOptions}
              selectedKeys={filters.brands}
              onToggle={(brand) =>
                updateFilters("brands", toggleMultiFilter(filters.brands, brand, available.brands))
              }
            />
          </div>
        </div>
      </div>
      <div className="shrink-0">{searchSlot}</div>
    </div>
  );

  // ── Type ──────────────────────────────────────────────────────────────────────
  const typeLabels: Record<LensType, SegmentedLabel> = {
    prime: { default: t("primes"), mobile: t("primesMobile") },
    zoom: { default: t("zooms"), mobile: t("zoomsMobile") },
  };

  const typeRow = (
    <FilterRow label={t("lensType")} className="min-w-0 flex-1 sm:flex-none">
      <TypeSegmentedControl
        ariaLabel={t("lensType")}
        options={buildSegmentedOptions(typeLabels, available.types)}
        value={filters.typeFilter}
        onChange={(v) => updateFilters("typeFilter", v)}
        variant="paired"
      />
    </FilterRow>
  );

  // ── Focus ─────────────────────────────────────────────────────────────────────
  const focusLabels: Record<FocusFilter, SegmentedLabel> = {
    auto: { default: t("focusAuto"), mobile: t("focusAutoMobile") },
    manual: { default: t("focusManual"), mobile: t("focusManualMobile") },
  };

  const focusRow = (
    <FilterRow label={t("focusFilter")} className="min-w-0 flex-1 sm:flex-none">
      <TypeSegmentedControl
        ariaLabel={t("focusFilter")}
        options={buildSegmentedOptions(focusLabels, available.focusModes)}
        value={filters.focusFilter}
        onChange={(v) => updateFilters("focusFilter", v)}
        variant="paired"
      />
    </FilterRow>
  );

  // ── Focal range ───────────────────────────────────────────────────────────────
  const focalOptions = available.focalCategories.map((key) => ({
    key,
    label: t(`category-${key}`),
    hint: t(`category-${key}Hint`),
  }));
  const focalRow =
    available.focalCategories.length > 0 ? (
      <FilterRow label={t("focalRange")}>
        <MultiSelectChipGroup
          allLabel={allOptionLabel}
          onSelectAll={() => updateFilters("focalCategories", [])}
          options={focalOptions}
          selectedKeys={filters.focalCategories}
          onToggle={(key) =>
            updateFilters(
              "focalCategories",
              toggleMultiFilter(filters.focalCategories, key, available.focalCategories),
            )
          }
        />
      </FilterRow>
    ) : null;

  // ── Features ──────────────────────────────────────────────────────────────────
  const featureMeta = {
    ois: { label: t("featureOis"), icon: FEATURE_ICONS.ois },
    wr: { label: t("featureWr"), icon: FEATURE_ICONS.wr },
    apertureRing: { label: t("featureApertureRing"), icon: FEATURE_ICONS.apertureRing },
    powerZoom: { label: t("featurePowerZoom"), icon: FEATURE_ICONS.powerZoom },
  } as const;
  const featureOptions = available.features.map((key) => ({
    key,
    label: featureMeta[key].label,
    icon: featureMeta[key].icon,
  }));
  const featuresRow =
    available.features.length > 0 ? (
      <FilterRow label={t("features")}>
        <FeatureToggleGroup
          options={featureOptions}
          selectedKeys={filters.features}
          onToggle={(key) => updateFilters("features", toggleValue(filters.features, key))}
        />
      </FilterRow>
    ) : null;

  // ── Optical trait ─────────────────────────────────────────────────────────────
  const opticalMobileLabels: Partial<Record<OpticalTrait, string>> = {
    tilt: tBadge("tiltMobile"),
    shift: tBadge("shiftMobile"),
  };
  const opticalLabels = Object.fromEntries(
    OPTICAL_TRAITS.map((trait) => [trait, { default: tBadge(trait), mobile: opticalMobileLabels[trait] }]),
  ) as Record<OpticalTrait, SegmentedLabel>;

  const opticalRow =
    available.opticalTraits.length > 0 ? (
      <FilterRow label={t("opticalTraitFilter")}>
        <TypeSegmentedControl
          ariaLabel={t("opticalTraitFilter")}
          options={buildSegmentedOptions(opticalLabels, available.opticalTraits)}
          value={filters.opticalTrait}
          onChange={(v) => updateFilters("opticalTrait", v)}
          variant="wrap"
        />
      </FilterRow>
    ) : null;

  // ── Focus motor ───────────────────────────────────────────────────────────────
  const motorLabels: Record<FocusMotorClass, SegmentedLabel> = {
    linear: { default: t("motorLinear"), mobile: t("motorLinearMobile") },
    stepping: { default: t("motorStepping"), mobile: t("motorSteppingMobile") },
    dc: { default: t("motorDc"), mobile: t("motorDcMobile") },
    other: { default: t("motorOther") },
  };

  const motorRow =
    available.focusMotorClasses.length > 0 ? (
      <FilterRow label={t("focusMotorFilter")}>
        <TypeSegmentedControl
          ariaLabel={t("focusMotorFilter")}
          options={buildSegmentedOptions(motorLabels, available.focusMotorClasses)}
          value={filters.focusMotorClass}
          onChange={(v) => updateFilters("focusMotorClass", v)}
          variant="wrap"
        />
      </FilterRow>
    ) : null;

  // ── More-filters toggle + reset ────────────────────────────────────────────────
  const moreFiltersCount = [
    filters.focalCategories.length > 0,
    filters.features.length > 0,
    filters.opticalTrait !== null,
    filters.focusMotorClass !== null,
  ].filter(Boolean).length;
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
      {activeFilterCount > 0 && (
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
        {brandRow}
        {/* Type + focus share one row on mobile (side by side) and split into two
            labeled rows on desktop — both shapes are pure responsive CSS. */}
        <div className="flex gap-2 sm:flex-col sm:gap-3">
          {typeRow}
          {focusRow}
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
            {focalRow}
            {featuresRow}
            {opticalRow}
            {motorRow}
          </div>
        </div>
      </div>
    </div>
  );
}
