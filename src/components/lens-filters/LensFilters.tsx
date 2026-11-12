"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, type LucideIcon, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import type { AvailableFilterOptions, FilterState, FocusFilter, FocusMotorClass, LensType, FilterFeatureKey, FocalCategory } from "@/lib/lens/lens";
import { APERTURE_FILTER_STOPS, FOCAL_CATEGORIES } from "@/lib/lens/lens";
import { WEIGHT_LIMIT_PRESETS } from "@/lib/lens/weight-tiers";
import { OPTICAL_TRAITS, type OpticalTrait } from "@/lib/types";
import { cn, parsePositiveDecimal } from "@/lib/utils";
import { brandLabel } from "@/lib/lens/format";
import { CHIP_BASE_CLS, CHIP_IDLE_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import BrandFilterMenu from "@/components/lens-filters/BrandFilterMenu";
import FilterRow from "@/components/lens-filters/FilterRow";
import ToggleChipGroup, { type ToggleChipOption } from "@/components/ui/toggle-chip-group";
import SegmentedControl, { type SegmentedLabel, type SegmentedOption } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rowLabelClass } from "@/components/lens-filters/styles";
import { useFiltersTelemetry } from "@/components/lens-filters/LensFilters.telemetry";

type FocalMode = "coverage" | "equivalent";

interface Props {
  filters: FilterState;
  available: AvailableFilterOptions;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
  onReset: () => void;
  searchSlot?: ReactNode;
  /** Sits at the end of the more-filters row, or under it when the row has no room. */
  assistSlot: ReactNode;
}

function NumericFilterInput({ label, value, onChange, unit, prefix, placeholder }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit: "mm" | "g";
  prefix?: string;
  placeholder: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="inline-flex h-11 items-center gap-1 rounded-lg border border-input px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-9">
      {prefix && <span className="text-xs text-muted-foreground" aria-hidden="true">{prefix}</span>}
      <input
        aria-label={label}
        inputMode="decimal"
        value={draft ?? value?.toString() ?? ""}
        onChange={(event) => {
          const text = event.target.value;
          const parsed = parsePositiveDecimal(text);
          setDraft(text);
          if ((parsed !== null || text === "") && parsed !== value) {
            onChange(parsed);
          }
        }}
        onBlur={() => setDraft(null)}
        placeholder={placeholder}
        className="w-12 min-w-0 bg-transparent text-base tabular-nums outline-none sm:text-sm"
      />
      <span className="text-xs text-muted-foreground" aria-hidden="true">{unit}</span>
    </div>
  );
}

export default function LensFilters({
  filters,
  available,
  onFiltersChange,
  activeFilterCount,
  onReset,
  searchSlot,
  assistSlot,
}: Props) {
  const t = useTranslations("LensList");
  const tBadge = useTranslations("SpecialtyBadge");
  const tBrand = useTranslations("Brands");
  const tChart = useTranslations("Charts");
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [focalMode, setFocalMode] = useState<FocalMode>(() =>
    filters.focalCategories.length ? "equivalent" : "coverage"
  );
  const [customWeightPending, setCustomWeightPending] = useState(false);
  const secondaryId = useId();

  useFiltersTelemetry(filters);

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

  // Selected brands beyond BRAND_PREVIEW_LIMIT collapse into a separate "+N" badge so the count is
  // never clipped.
  const BRAND_PREVIEW_LIMIT = 2;
  const brandJoiner = t("brandSeparator");
  const brandNames = Object.fromEntries(available.brands.map((b) => [b, brandLabel(tBrand, b)]));
  const selectedBrandNames = filters.brands.map((b) => brandNames[b] ?? b);
  const brandExtraCount = Math.max(0, selectedBrandNames.length - BRAND_PREVIEW_LIMIT);
  const brandTriggerLabel =
    selectedBrandNames.length === 0
      ? t("brand")
      : selectedBrandNames.slice(0, BRAND_PREVIEW_LIMIT).join(brandJoiner);
  const brandOptions: ToggleChipOption<string>[] = available.brands.map((brand) => ({
    key: brand,
    label: brandLabel(tBrand, brand),
  }));
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
            <ToggleChipGroup
              allOption={{ label: allOptionLabel, onSelect: () => updateFilters("brands", []) }}
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

  const typeLabels: Record<LensType, SegmentedLabel> = {
    prime: { default: t("primes"), mobile: t("primesMobile") },
    zoom: { default: t("zooms"), mobile: t("zoomsMobile") },
  };

  const typeRow = (
    <FilterRow label={t("lensType")} className="min-w-0 flex-1 sm:flex-none">
      <SegmentedControl
        ariaLabel={t("lensType")}
        options={buildSegmentedOptions(typeLabels, available.types)}
        value={filters.typeFilter}
        onChange={(v) => updateFilters("typeFilter", v)}
        layout="paired"
      />
    </FilterRow>
  );

  const focusLabels: Record<FocusFilter, SegmentedLabel> = {
    auto: { default: t("focusAuto"), mobile: t("focusAutoMobile") },
    manual: { default: t("focusManual"), mobile: t("focusManualMobile") },
  };

  const focusRow = (
    <FilterRow label={t("focusFilter")} className="min-w-0 flex-1 sm:flex-none">
      <SegmentedControl
        ariaLabel={t("focusFilter")}
        options={buildSegmentedOptions(focusLabels, available.focusModes)}
        value={filters.focusFilter}
        onChange={(v) => updateFilters("focusFilter", v)}
        layout="paired"
      />
    </FilterRow>
  );

  const focalOptions: ToggleChipOption<FocalCategory>[] = FOCAL_CATEGORIES
    .filter(({ key }) => available.focalCategories.includes(key))
    .map((category) => {
      const hint = !("equivMinInclusive" in category)
        ? t("focalBelow", { max: category.equivMaxExclusive })
        : !("equivMaxExclusive" in category)
          ? t("focalAtLeast", { min: category.equivMinInclusive })
          : t("focalBetween", { min: category.equivMinInclusive, max: category.equivMaxExclusive });
      return { key: category.key, label: t(`category-${category.key}`), hint };
    });

  const focalRow = (
    <FilterRow label={t("focalRange")}>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<FocalMode>
            ariaLabel={t("focalRange")}
            options={[
              { value: "coverage", label: { default: t("focalCoverage") } },
              { value: "equivalent", label: { default: t("focalEquivalent") } },
            ]}
            value={focalMode}
            onChange={(mode) => {
              if (mode === focalMode) {
                return;
              }
              setFocalMode(mode);
              onFiltersChange({ ...filters, focalLengthMm: null, focalCategories: [] });
            }}
            layout="paired"
          />
          {focalMode === "coverage" && (
            <NumericFilterInput
              label={t("focalCoverageInput")}
              value={filters.focalLengthMm}
              onChange={(value) => updateFilters("focalLengthMm", value)}
              placeholder="27"
              unit="mm"
            />
          )}
        </div>
        {focalMode === "equivalent" && (
          <ToggleChipGroup
            allOption={{ label: allOptionLabel, onSelect: () => updateFilters("focalCategories", []) }}
            options={focalOptions}
            selectedKeys={filters.focalCategories}
            onToggle={(key) =>
              updateFilters(
                "focalCategories",
                toggleMultiFilter(filters.focalCategories, key, available.focalCategories),
              )
            }
          />
        )}
      </div>
    </FilterRow>
  );

  const apertureItems = [
    { value: "all", label: t("apertureAny") },
    ...APERTURE_FILTER_STOPS.map((aperture) => ({
      value: String(aperture),
      label: t("apertureOrFaster", { aperture }),
    })),
  ];
  const weightLimit = filters.weightLimit;
  const customWeight = customWeightPending || weightLimit?.kind === "custom";
  const weightItems = [
    { value: "all", label: t("noLimit") },
    ...WEIGHT_LIMIT_PRESETS.map(({ key, grams }) => {
      const tier = tChart(`tier-${key}`);
      return {
        value: String(grams),
        label: t("weightTierLimit", { tier: key === "pocket" ? tier : t("weightTierOrLighter", { tier }), grams }),
      };
    }),
    { value: "custom", label: t("customWeight") },
  ];
  const weightRow = (
    <FilterRow label={t("weightLimit")}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select
          value={customWeight ? "custom" : weightLimit?.grams.toString() ?? "all"}
          items={weightItems}
          onValueChange={(value) => {
            const preset = WEIGHT_LIMIT_PRESETS.find(({ grams }) => String(grams) === value);
            setCustomWeightPending(value === "custom");
            updateFilters("weightLimit", preset ? { kind: "preset", grams: preset.grams } : null);
          }}
        >
          <SelectTrigger aria-label={t("weightLimit")} className="min-h-11 sm:min-h-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="w-max max-w-(--available-width)">
            {weightItems.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customWeight && (
          <NumericFilterInput
            label={t("customWeightInput")}
            value={weightLimit?.grams ?? null}
            onChange={(grams) => {
              setCustomWeightPending(grams === null);
              updateFilters("weightLimit", grams === null ? null : { kind: "custom", grams });
            }}
            unit="g"
            prefix="≤"
            placeholder={t("weightPlaceholder")}
          />
        )}
      </div>
    </FilterRow>
  );

  const apertureRow = (
    <FilterRow label={t("sortAperture")}>
      <Select
        value={filters.maxAperture?.toString() ?? "all"}
        items={apertureItems}
        onValueChange={(value) => updateFilters("maxAperture", APERTURE_FILTER_STOPS.find((stop) => String(stop) === value) ?? null)}
      >
        <SelectTrigger aria-label={t("sortAperture")} className="min-h-11 sm:min-h-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {apertureItems.map(({ value, label }) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterRow>
  );

  const featureMeta: Record<FilterFeatureKey, {label: string; icon: LucideIcon}> = {
    ois: { label: t("featureOis"), icon: FEATURE_ICONS.ois },
    wr: { label: t("featureWr"), icon: FEATURE_ICONS.wr },
    apertureRing: { label: t("featureApertureRing"), icon: FEATURE_ICONS.apertureRing },
    powerZoom: { label: t("featurePowerZoom"), icon: FEATURE_ICONS.powerZoom },
    internalZoom: { label: t("featureInternalZoom"), icon: FEATURE_ICONS.internalZoom },
  };

  const featureOptions: ToggleChipOption<FilterFeatureKey>[] = available.features.map((key) => ({
    key,
    label: featureMeta[key].label,
    icon: featureMeta[key].icon,
  }));

  const featuresRow =
    available.features.length > 0 ? (
      <FilterRow label={t("features")}>
        <ToggleChipGroup
          options={featureOptions}
          selectedKeys={filters.features}
          onToggle={(key) => updateFilters("features", toggleValue(filters.features, key))}
        />
      </FilterRow>
    ) : null;

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
        <SegmentedControl
          ariaLabel={t("opticalTraitFilter")}
          options={buildSegmentedOptions(opticalLabels, available.opticalTraits)}
          value={filters.opticalTrait}
          onChange={(v) => updateFilters("opticalTrait", v)}
          layout="wrap"
        />
      </FilterRow>
    ) : null;

  const motorLabels: Record<FocusMotorClass, SegmentedLabel> = {
    linear: { default: t("motorLinear"), mobile: t("motorLinearMobile") },
    stepping: { default: t("motorStepping"), mobile: t("motorSteppingMobile") },
    dc: { default: t("motorDc"), mobile: t("motorDcMobile") },
    other: { default: t("motorOther") },
  };

  const motorRow =
    available.focusMotorClasses.length > 0 ? (
      <FilterRow label={t("focusMotorFilter")}>
        <SegmentedControl
          ariaLabel={t("focusMotorFilter")}
          options={buildSegmentedOptions(motorLabels, available.focusMotorClasses)}
          value={filters.focusMotorClass}
          onChange={(v) => updateFilters("focusMotorClass", v)}
          layout="wrap"
        />
      </FilterRow>
    ) : null;

  const moreFiltersCount = [
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
      )}
      onClick={() => setSecondaryOpen((v) => !v)}
      aria-expanded={secondaryOpen}
      aria-controls={secondaryId}
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
        <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-full bg-zinc-900 font-mono text-[9px] font-bold leading-none text-white">
          {moreFiltersCount}
        </span>
      )}
    </button>
  );

  const filtersMetaRow = (
    <div className="inline-flex flex-wrap items-center gap-x-2 sm:gap-x-4">
      {filtersToggle}
      {!secondaryOpen && weightLimit !== null && (
        <button
          type="button"
          aria-label={t("clearWeightLimit")}
          className={cn(CHIP_BASE_CLS, CHIP_IDLE_CLS, "min-h-11 sm:min-h-0")}
          onClick={() => {
            setCustomWeightPending(false);
            updateFilters("weightLimit", null);
          }}
        >
          {t(weightLimit.kind === "preset" ? "weightUnder" : "weightAtMost", { grams: weightLimit.grams })}
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
      {!secondaryOpen && filters.maxAperture !== null && (
        <button
          type="button"
          aria-label={t("clearAperture")}
          className={cn(CHIP_BASE_CLS, CHIP_IDLE_CLS, "min-h-11 sm:min-h-0")}
          onClick={() => updateFilters("maxAperture", null)}
        >
          {t("apertureOrFaster", { aperture: filters.maxAperture })}
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
      {activeFilterCount > 0 && (
        <>
          <span className="text-[12px] text-zinc-300">·</span>
          <button
            type="button"
            onClick={() => {
              setCustomWeightPending(false);
              onReset();
            }}
            aria-label={t("reset")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-rose-800 hover:text-rose-900"
          >
            <span className="inline-flex items-center gap-1.5 underline underline-offset-4 decoration-rose-200">
              <RotateCcw size={11} />
              {t("reset")}
            </span>
            <span aria-hidden="true" className="inline-flex size-4 items-center justify-center rounded-full bg-rose-800 font-mono text-[9px] font-bold leading-none text-white">
              {activeFilterCount}
            </span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 sm:gap-3">
        {brandRow}
        <div className="flex gap-2 sm:flex-col sm:gap-3">
          {typeRow}
          {focusRow}
        </div>
        {focalRow}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:my-1.5">
          {filtersMetaRow}
          <div className="ml-auto">{assistSlot}</div>
        </div>
      </div>

      <div
        id={secondaryId}
        inert={!secondaryOpen}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-500 ease-in-out",
          secondaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3.5 pt-3 pb-1 sm:gap-3">
            <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-4">
              {weightRow}
              {apertureRow}
            </div>
            {featuresRow}
            {opticalRow}
            {motorRow}
          </div>
        </div>
      </div>
    </div>
  );
}
