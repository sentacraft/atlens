"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import ChartChips from "@/components/charts/ChartChips";
import { useCompare } from "@/context/CompareProvider";
import { COMPARE_CHIP_STATE_CLS } from "@/config/ui-tokens";
import { useChartSelection } from "@/hooks/useChartSelection";
import { type BrandCount, type ChartLens } from "@/lib/charts/catalog";
import type { WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { FOCAL_CATEGORIES, MAX_COMPARE } from "@/lib/lens/lens";
import { lensPath } from "@/lib/url/routes";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import { cn } from "@/lib/utils";

const PHONE_TIER_PREVIEW = 6;

type Props = {
  tiers: WeightTier[];
  brands: BrandCount[];
};

export function WeightLadderChartFromUrl(props: Props) {
  const initial = readChartSelectionFromSearch(useSearchParams(), props.brands.map((b) => b.brand));
  return <WeightLadderChart {...props} initial={initial} />;
}

export default function WeightLadderChart({ tiers, brands, initial }: Props & { initial: ChartSelection }) {
  const t = useTranslations("Charts");
  const tList = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const { selected, select } = useChartSelection(initial);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const heaviest = Math.max(...tiers.flatMap((tier) => tier.lenses.map((l) => l.weightG)));

  const matches = (lens: ChartLens) =>
    (!selected.brand || lens.brand === selected.brand) &&
    (!selected.focal || lens.focalCategories.includes(selected.focal));
  const filtering = Boolean(selected.brand || selected.focal);

  const range = (tier: WeightTier) =>
    tier.maxG === undefined
      ? t("rangeAtLeast", { min: tier.minG })
      : tier.minG === 0
        ? t("rangeUnder", { max: tier.maxG })
        : t("rangeBetween", { min: tier.minG, max: tier.maxG - 1 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ChartChips
          label={t("filterFocal")}
          chips={FOCAL_CATEGORIES.map((c) => ({ key: c.key, label: tList(`category-${c.key}`) }))}
          selected={selected.focal}
          onSelect={(focal) => select({ ...selected, focal })}
        />
        <ChartChips
          label={t("filterBrand")}
          chips={brands.map((b) => ({ key: b.brand, label: `${brandLabel(tBrand, b.brand)} ${b.count}` }))}
          selected={selected.brand}
          onSelect={(brand) => select({ ...selected, brand })}
        />
      </div>

      {tiers.map((tier) => {
        const lenses = tier.lenses.filter(matches);
        const open = expanded[tier.key] ?? false;
        const hidden = lenses.length - PHONE_TIER_PREVIEW;
        return (
          <section key={tier.key} aria-labelledby={`tier-${tier.key}`} className="border-t border-zinc-200 pt-4 md:grid md:grid-cols-[148px_1fr] md:gap-4">
            <header className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:mb-0 md:flex-col md:gap-1">
              <h2 id={`tier-${tier.key}`} className="font-heading text-xl font-bold text-zinc-900 md:text-2xl">
                {t(`tier-${tier.key}`)}
              </h2>
              <span className="text-[13px] tabular-nums text-zinc-700">{range(tier)}</span>
              <span className="text-xs text-zinc-500">{filtering
                  ? t("filteredCount", { shown: lenses.length, total: tier.lenses.length })
                  : t("lensCount", { count: tier.lenses.length })}</span>
              <span className="w-full text-xs text-zinc-600">{t(`tier-${tier.key}-tagline`)}</span>
            </header>
            {lenses.length > 0 && (
              <div>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))] md:gap-2.5">
                  {lenses.map((lens, i) => (
                    <li key={lens.id} className={cn(!open && i >= PHONE_TIER_PREVIEW && "max-md:hidden")}>
                      <LadderTile lens={lens} barPct={Math.round(Math.sqrt(lens.weightG / heaviest) * 100)} />
                    </li>
                  ))}
                </ul>
                {!open && hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [tier.key]: true }))}
                    className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-700 md:hidden"
                  >
                    {t("showAll", { count: lenses.length })}
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LadderTile({ lens, barPct }: { lens: ChartLens; barPct: number }) {
  const t = useTranslations("Charts");
  const tList = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const { compareIds, toggle } = useCompare();
  const selected = compareIds.includes(lens.id);
  const full = !selected && compareIds.length >= MAX_COMPARE;
  const name = `${brandLabel(tBrand, lens.brand)} ${lens.model}`;

  return (
    <div className="relative flex h-full flex-col gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 pb-2 transition-colors hover:border-zinc-900">
      <Link href={lensPath(lens)} aria-label={name} className="absolute inset-0 z-0 rounded-xl" />
      <Image src={getLensImageUrl(lens.id)} alt="" width={96} height={96} className="pointer-events-none aspect-square w-full object-contain" />
      <span className="pointer-events-none truncate text-[9px] uppercase tracking-[0.12em] text-zinc-500">{brandLabel(tBrand, lens.brand)}</span>
      <span className="pointer-events-none line-clamp-2 min-h-7 text-[11px] leading-[14px] text-zinc-900">{lens.model}</span>
      <span className="pointer-events-none flex items-center gap-1.5">
        <span className="text-[13px] font-bold tabular-nums text-zinc-900">{t("weight", { weight: lens.weightG })}</span>
        <span className="flex h-1 flex-1 overflow-hidden rounded bg-zinc-100" aria-hidden="true">
          <span className="rounded bg-zinc-900" style={{ width: `${barPct}%` }} />
        </span>
      </span>
      <button
        type="button"
        onClick={full ? () => toast(tList("compareFullToast")) : () => toggle(lens.id)}
        aria-pressed={selected}
        aria-label={`${selected ? tList("removeFromCompare") : full ? tList("compareFull") : tList("addToCompare")}: ${name}`}
        className={cn(
          "absolute right-1 top-1 z-10 inline-flex size-7 items-center justify-center rounded-full border transition-colors",
          selected ? COMPARE_CHIP_STATE_CLS.selected : full ? COMPARE_CHIP_STATE_CLS.full : COMPARE_CHIP_STATE_CLS.idle,
        )}
      >
        {selected ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
      </button>
    </div>
  );
}
