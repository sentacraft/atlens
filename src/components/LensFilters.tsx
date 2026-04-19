"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { FILTER_FEATURE_KEYS, FOCAL_CATEGORIES, LENS_TYPES } from "@/lib/lens";
import type { FilterState, FocusFilter, FocusMotorClass, LensType, SpecialtyTag } from "@/lib/lens";
import { cn } from "@/lib/utils";
import FeatureToggleGroup from "./lens-filters/FeatureToggleGroup";
import FilterRow from "./lens-filters/FilterRow";
import MultiSelectChipGroup from "./lens-filters/MultiSelectChipGroup";
import TypeSegmentedControl from "./lens-filters/TypeSegmentedControl";

interface Props {
  filters: FilterState;
  brands: string[];
  availableSpecialtyTags: SpecialtyTag[];
  onFiltersChange: (filters: FilterState) => void;
}

export default function LensFilters({
  filters,
  brands,
  availableSpecialtyTags,
  onFiltersChange,
}: Props) {
  const t = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const [secondaryOpen, setSecondaryOpen] = useState(false);

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

  const tagLabels: Record<SpecialtyTag, string> = {
    cine: t("tagCine"),
    anamorphic: t("tagAnamorphic"),
    tilt: t("tagTilt"),
    shift: t("tagShift"),
    macro: t("tagMacro"),
    ultra_macro: t("tagUltraMacro"),
    fisheye: t("tagFisheye"),
    probe: t("tagProbe"),
  };

  const typeOptions = [
    { value: null, label: t("allTypes") },
    ...LENS_TYPES.map((type) => ({
      value: type,
      label: t(type === "prime" ? "primes" : "zooms"),
    })),
  ] as { value: LensType | null; label: string }[];

  const specialtyOptions = [
    { value: null as SpecialtyTag | null, label: t("allSpecialty") },
    ...availableSpecialtyTags.map((tag) => ({
      value: tag as SpecialtyTag | null,
      label: tagLabels[tag],
    })),
  ];

  const focusMotorOptions = [
    { value: null, label: t("allTypes") },
    { value: "linear" as FocusMotorClass, label: t("motorLinear") },
    { value: "stepping" as FocusMotorClass, label: t("motorStepping") },
    { value: "other" as FocusMotorClass, label: t("motorOther") },
  ] as { value: FocusMotorClass | null; label: string }[];

  const focusOptions = [
    { value: null, label: t("allTypes") },
    { value: "auto" as FocusFilter, label: t("focusAuto") },
    { value: "manual" as FocusFilter, label: t("focusManual") },
  ] as { value: FocusFilter | null; label: string }[];

  const hasHiddenActiveFilters =
    filters.focalCategories.length > 0 ||
    filters.features.length > 0 ||
    filters.specialtyTag !== null ||
    filters.focusMotorClass !== null;

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

  const filtersButton = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 self-start text-[11px] font-medium uppercase tracking-[0.08em]",
        "text-zinc-700 transition-colors hover:text-zinc-900",
        "dark:text-zinc-300 dark:hover:text-zinc-100",
      )}
      onClick={() => setSecondaryOpen((v) => !v)}
      aria-expanded={secondaryOpen}
    >
      <SlidersHorizontal className="size-3.5" />
      <span className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400">
        {secondaryOpen ? t("fewerFilters") : t("moreFilters")}
      </span>
      <ChevronDown
        className={cn(
          "size-3.5 transition-transform duration-200",
          secondaryOpen && "rotate-180",
        )}
      />
      {hasHiddenActiveFilters && !secondaryOpen && (
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
      )}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Primary filters: always visible on all viewports */}
      <div className="flex flex-col gap-3">
        <FilterRow label={t("brand")}>
          <MultiSelectChipGroup
            allLabel={allOptionLabel}
            allSelected={filters.brands.length === 0}
            onSelectAll={() => updateFilters("brands", [])}
            options={brandOptions}
          />
        </FilterRow>

        <FilterRow label={t("lensType")}>
          <TypeSegmentedControl
            ariaLabel={t("lensType")}
            options={typeOptions}
            value={filters.typeFilter}
            onChange={(v) => updateFilters("typeFilter", v)}
          />
        </FilterRow>

        <FilterRow label={t("focusFilter")}>
          <TypeSegmentedControl
            ariaLabel={t("focusFilter")}
            options={focusOptions}
            value={filters.focusFilter}
            onChange={(v) => updateFilters("focusFilter", v)}
          />
        </FilterRow>

        {filtersButton}
      </div>

      {/* Secondary filters: collapsed on mobile by default, always open on desktop */}
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-500 ease-in-out",
          secondaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 pt-3 pb-1">
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

            {availableSpecialtyTags.length > 0 && (
              <FilterRow label={t("specialtyFilter")}>
                <TypeSegmentedControl
                  ariaLabel={t("specialtyFilter")}
                  options={specialtyOptions}
                  value={filters.specialtyTag}
                  onChange={(v) => updateFilters("specialtyTag", v)}
                  wrap
                />
              </FilterRow>
            )}

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
  );
}
