"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { FILTER_FEATURE_KEYS, FOCAL_CATEGORIES, LENS_TYPES } from "@/lib/lens";
import type { FilterState, FocusFilter, FocusMotorClass, LensType, UsageFilter } from "@/lib/lens";
import type { OpticalTrait } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TEXT_LINK_CLS } from "@/lib/ui-tokens";
import BrandFilterMenu from "./lens-filters/BrandFilterMenu";
import FeatureToggleGroup from "./lens-filters/FeatureToggleGroup";
import FilterRow from "./lens-filters/FilterRow";
import MultiSelectChipGroup from "./lens-filters/MultiSelectChipGroup";
import SingleSelectChipGroup from "./lens-filters/SingleSelectChipGroup";
import TypeSegmentedControl from "./lens-filters/TypeSegmentedControl";
import { useFiltersTelemetry } from "./LensFilters.telemetry";

interface Props {
  filters: FilterState;
  brands: string[];
  availableOpticalTraits: OpticalTrait[];
  onFiltersChange: (filters: FilterState) => void;
}

export default function LensFilters({
  filters,
  brands,
  availableOpticalTraits,
  onFiltersChange,
}: Props) {
  const t = useTranslations("LensList");
  const tBadge = useTranslations("SpecialtyBadge");
  const tBrand = useTranslations("Brands");
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const BRAND_PREVIEW_LIMIT = 2;
  const brandJoiner = t("brandSeparator");
  const brandNames = Object.fromEntries(brands.map((b) => [b, tBrand(b)]));
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

  const typeOptions = [
    { value: null, label: t("allTypes") },
    ...LENS_TYPES.map((type) => ({
      value: type,
      label: t(type === "prime" ? "primes" : "zooms"),
    })),
  ] as { value: LensType | null; label: string }[];

  const usageOptions = [
    { value: "photo" as UsageFilter, label: t("usagePhoto") },
    { value: "cine" as UsageFilter, label: t("usageCine") },
  ] as { value: UsageFilter; label: string }[];

  const opticalTraitOptions = [
    { value: null as OpticalTrait | null, label: t("allTypes") },
    ...availableOpticalTraits.map((trait) => ({
      value: trait as OpticalTrait | null,
      label: tBadge(trait),
    })),
  ];

  const focusMotorOptions = [
    { value: null, label: t("allTypes") },
    { value: "linear" as FocusMotorClass, label: t("motorLinear") },
    { value: "stepping" as FocusMotorClass, label: t("motorStepping") },
    { value: "dc" as FocusMotorClass, label: t("motorDc") },
    { value: "other" as FocusMotorClass, label: t("motorOther") },
  ] as { value: FocusMotorClass | null; label: string }[];

  const focusOptions = [
    { value: null, label: t("allTypes") },
    { value: "auto" as FocusFilter, label: t("focusAuto") },
    { value: "manual" as FocusFilter, label: t("focusManual") },
  ] as { value: FocusFilter | null; label: string }[];

  const mobileTypeOptions = [
    { value: null, label: t("anyType") },
    ...LENS_TYPES.map((type) => ({
      value: type,
      label: t(type === "prime" ? "primesMobile" : "zoomsMobile"),
    })),
  ] as { value: LensType | null; label: string }[];

  const mobileFocusOptions = [
    { value: null, label: t("anyFocus") },
    { value: "auto" as FocusFilter, label: t("focusAutoMobile") },
    { value: "manual" as FocusFilter, label: t("focusManualMobile") },
  ] as { value: FocusFilter | null; label: string }[];

  const hiddenActiveFilterCount =
    (filters.focalCategories.length > 0 ? 1 : 0) +
    (filters.features.length > 0 ? 1 : 0) +
    (filters.opticalTrait !== null ? 1 : 0) +
    (filters.focusMotorClass !== null ? 1 : 0);

  const allOptionLabel = t("allTypes");

  const brandOptions = brands.map((brand) => ({
    key: brand,
    label: tBrand(brand),
    selected: filters.brands.includes(brand),
    onClick: () =>
      updateFilters("brands", toggleMultiFilter(filters.brands, brand, brands)),
  }));

  const focalOptions = FOCAL_CATEGORIES.map((category) => ({
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
          FOCAL_CATEGORIES.map((item) => item.key),
        ),
      ),
  }));

  const featureOptions = FILTER_FEATURE_KEYS.map((key) => ({
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
      {hiddenActiveFilterCount > 0 && !secondaryOpen && (
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold leading-none text-white dark:bg-zinc-100 dark:text-zinc-900">
          {hiddenActiveFilterCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Primary filters: always visible on all viewports */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between sm:hidden">
          <BrandFilterMenu
            brands={brands}
            selected={filters.brands}
            brandLabels={brandNames}
            allLabel={allOptionLabel}
            triggerLabel={brandTriggerLabel}
            onToggle={(brand) =>
              updateFilters("brands", toggleMultiFilter(filters.brands, brand, brands))
            }
            onClear={() => updateFilters("brands", [])}
          />
          <div className="shrink-0">{filtersToggle}</div>
        </div>
        <div className="hidden sm:block">
          <FilterRow label={t("brand")}>
            <MultiSelectChipGroup
              allLabel={allOptionLabel}
              allSelected={filters.brands.length === 0}
              onSelectAll={() => updateFilters("brands", [])}
              options={brandOptions}
            />
          </FilterRow>
        </div>

        <div className="flex gap-2 sm:hidden">
          <TypeSegmentedControl
            ariaLabel={t("lensType")}
            options={mobileTypeOptions}
            value={filters.typeFilter}
            onChange={(v) => updateFilters("typeFilter", v)}
            compact
          />
          <TypeSegmentedControl
            ariaLabel={t("focusFilter")}
            options={mobileFocusOptions}
            value={filters.focusFilter}
            onChange={(v) => updateFilters("focusFilter", v)}
            compact
          />
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

        <div className="my-1.5 hidden sm:block">{filtersToggle}</div>
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
            <FilterRow label={t("focalRange")}>
              <MultiSelectChipGroup
                allLabel={allOptionLabel}
                allSelected={filters.focalCategories.length === 0}
                onSelectAll={() => updateFilters("focalCategories", [])}
                options={focalOptions}
              />
            </FilterRow>

            <FilterRow label={t("features")}>
              <FeatureToggleGroup options={featureOptions} />
            </FilterRow>

            <FilterRow label={t("usage")} labelOn="desktop">
              <TypeSegmentedControl
                ariaLabel={t("usage")}
                options={usageOptions}
                value={filters.usage}
                onChange={(v) => updateFilters("usage", v)}
                mobileLabelOverrides={{
                  photo: t("usagePhotoMobile"),
                  cine: t("usageCineMobile"),
                }}
              />
            </FilterRow>

            {availableOpticalTraits.length > 0 && (
              <>
                <div className="sm:hidden">
                  <FilterRow label={t("opticalTraitFilter")}>
                    <SingleSelectChipGroup
                      allLabel={allOptionLabel}
                      options={opticalTraitOptions.slice(1)}
                      value={filters.opticalTrait}
                      onChange={(v) => updateFilters("opticalTrait", v)}
                    />
                  </FilterRow>
                </div>
                <div className="hidden sm:block">
                  <FilterRow label={t("opticalTraitFilter")}>
                    <TypeSegmentedControl
                      ariaLabel={t("opticalTraitFilter")}
                      options={opticalTraitOptions}
                      value={filters.opticalTrait}
                      onChange={(v) => updateFilters("opticalTrait", v)}
                      wrap
                    />
                  </FilterRow>
                </div>
              </>
            )}

            <div className="sm:hidden">
              <FilterRow label={t("focusMotorFilter")}>
                <SingleSelectChipGroup
                  allLabel={allOptionLabel}
                  options={focusMotorOptions.slice(1)}
                  value={filters.focusMotorClass}
                  onChange={(v) => updateFilters("focusMotorClass", v)}
                />
              </FilterRow>
            </div>
            <div className="hidden sm:block">
              <FilterRow label={t("focusMotorFilter")}>
                <TypeSegmentedControl
                  ariaLabel={t("focusMotorFilter")}
                  options={focusMotorOptions}
                  value={filters.focusMotorClass}
                  onChange={(v) => updateFilters("focusMotorClass", v)}
                  wrap
                />
              </FilterRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
