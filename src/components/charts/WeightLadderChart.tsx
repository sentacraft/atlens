"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Plus, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ChartChips from "@/components/charts/ChartChips";
import FavoriteStarButton from "@/components/lens/FavoriteStarButton";
import ChartLensSheet from "@/components/charts/ChartLensSheet";
import { HOVER_REVEAL_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import { useFavorites } from "@/hooks/useFavorites";
import { useChartSelection } from "@/hooks/useChartSelection";
import { focalSpecArgs, type BrandCount, type ChartLens } from "@/lib/charts/catalog";
import type { WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { FOCAL_CATEGORIES } from "@/lib/lens/lens";
import type { Mount } from "@/lib/types";
import { lensPath, brandPath } from "@/lib/url/routes";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import { cn } from "@/lib/utils";

const PHONE_TIER_PREVIEW = 6;

type Props = {
  mount: Mount;
  tiers: WeightTier[];
  brands: BrandCount[];
};

export function WeightLadderChartFromUrl(props: Props) {
  const initial = readChartSelectionFromSearch(useSearchParams(), props.brands.map((b) => b.brand));
  return <WeightLadderChart {...props} initial={initial} />;
}

export default function WeightLadderChart({ mount, tiers, brands, initial }: Props & { initial: ChartSelection }) {
  const t = useTranslations("Charts");
  const tList = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const { selected, select } = useChartSelection(initial);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // The lens is kept after closing so the sheet does not empty out during its exit animation.
  const [sheet, setSheet] = useState<{ lens?: ChartLens; open: boolean }>({ open: false });
  const openSheet = useCallback((lens: ChartLens) => setSheet({ lens, open: true }), []);
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
          label={t("filterBrand")}
          chips={brands.map((b) => ({ key: b.brand, label: `${brandLabel(tBrand, b.brand)} ${b.count}` }))}
          selected={selected.brand}
          onSelect={(brand) => select({ ...selected, brand })}
        />
        <ChartChips
          label={t("filterFocal")}
          chips={FOCAL_CATEGORIES.map((c) => ({ key: c.key, label: tList(`category-${c.key}`) }))}
          selected={selected.focal}
          onSelect={(focal) => select({ ...selected, focal })}
        />
        {selected.brand && (
          <Link href={brandPath(mount, selected.brand)} className={cn(TEXT_LINK_CLS, "self-start text-sm")}>
            {t("seeBrand", {
              brand: brandLabel(tBrand, selected.brand),
              count: brands.find((b) => b.brand === selected.brand)?.count ?? 0,
            })}
          </Link>
        )}
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
                      <LadderTile lens={lens} onOpen={openSheet} barPct={Math.round(Math.sqrt(lens.weightG / heaviest) * 100)} />
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

      <ChartLensSheet
        lens={sheet.lens}
        spec={sheet.lens ? `${t("focalSpec", focalSpecArgs(sheet.lens))} · ${t("weight", { weight: sheet.lens.weightG })}` : ""}
        open={sheet.open}
        onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
      />
    </div>
  );
}

// Mouse users get the actions on the tile; touch has no hover, so a tap opens the lens sheet instead
// and the tile only marks what is already favorited or compared.
function LadderTile({ lens, barPct, onOpen }: { lens: ChartLens; barPct: number; onOpen: (lens: ChartLens) => void }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const compare = useCompareToggle(lens.id);
  const favorited = useFavorites().isFavorite(lens.id);
  const lastPointer = useRef("mouse");
  const name = `${brandLabel(tBrand, lens.brand)} ${lens.model}`;

  return (
    <div className="group relative flex h-full flex-col gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 pb-2 transition-colors hover:border-zinc-900 has-focus-visible:border-zinc-900">
      <Link
        href={lensPath(lens)}
        aria-label={name}
        className="absolute inset-0 z-0 rounded-xl"
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onClick={(e) => {
          if (lastPointer.current !== "mouse") {
            e.preventDefault();
            onOpen(lens);
          }
        }}
      />
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
        onClick={compare.onToggle}
        aria-pressed={compare.selected}
        aria-label={`${compare.label}: ${name}`}
        className={cn(
          "absolute left-1 top-1 z-10 inline-flex size-7 items-center justify-center rounded-full border shadow-sm transition-[opacity,background-color,color] pointer-coarse:hidden",
          compare.stateCls,
          !compare.selected && HOVER_REVEAL_CLS,
        )}
      >
        {compare.selected ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
      </button>
      <FavoriteStarButton lensId={lens.id} placement="overlay" className="absolute right-1 top-1 h-7 w-7 pointer-coarse:hidden" />
      {compare.selected && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white pointer-fine:hidden" aria-hidden="true">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      {favorited && (
        <Star className="pointer-events-none absolute right-1.5 top-1.5 size-4 fill-zinc-900 stroke-white text-zinc-900 pointer-fine:hidden" aria-hidden="true" />
      )}
    </div>
  );
}
