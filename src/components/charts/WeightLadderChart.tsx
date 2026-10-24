"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ChartChips from "@/components/charts/ChartChips";
import ChartLensItem from "@/components/charts/ChartLensItem";
import ChartLensSheet from "@/components/charts/ChartLensSheet";
import LensActions from "@/components/lens/LensActions";
import { PAGE_SECTION_HEADING_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { useChartCard, type ChartItemHandlers } from "@/hooks/useChartCard";
import { useChartSelection } from "@/hooks/useChartSelection";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import { useFavorites } from "@/hooks/useFavorites";
import { matchesChartSelection, type BrandCount, type ChartLens } from "@/lib/charts/catalog";
import { weightBarPct, type WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import type { Mount } from "@/lib/types";
import { brandPath } from "@/lib/url/routes";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import { cn } from "@/lib/utils";

const PHONE_TIER_PREVIEW = 6;

// A poster is rasterized at a fixed width, so it takes one layout whatever the screen.
const LAYOUT = {
  page: {
    list: "gap-6",
    section: "border-t border-zinc-200 pt-4 md:grid md:grid-cols-[176px_1fr] md:gap-4",
    header: "mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:mb-0 md:flex-col md:gap-1",
    name: PAGE_SECTION_HEADING_CLS,
    detail: "text-xs",
    grid: "grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))] md:gap-2.5",
    tile: "rounded-xl border border-zinc-200 bg-white p-1.5 pb-2 transition-colors hover:border-zinc-900 has-focus-visible:border-zinc-900",
    tileBrand: "text-[9px]",
    tileModel: "min-h-7 text-[11px] leading-[14px]",
    tileWeight: "text-[13px]",
  },
  poster: {
    list: "gap-7",
    section: "flex flex-col gap-3",
    header: "flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-zinc-200 pb-2",
    name: "font-heading text-[28px] font-bold text-zinc-900",
    detail: "text-base",
    grid: "grid grid-cols-8 gap-x-6 gap-y-7",
    tile: "",
    tileBrand: "text-[10px]",
    tileModel: "min-h-[30px] text-xs leading-[15px]",
    tileWeight: "text-sm",
  },
} as const;

type PageProps = { mount: Mount; tiers: WeightTier[]; brands: BrandCount[] };

/** `page`: the ladder with its brand and focal filters. `poster`: every tier at a fixed width, filtered, with nothing to click. */
type Mode = ({ kind: "page"; initial: ChartSelection } & Pick<PageProps, "mount" | "brands">) | { kind: "poster"; selection: ChartSelection };

export function WeightLadderChartFromUrl({ tiers, ...page }: PageProps) {
  const initial = readChartSelectionFromSearch(useSearchParams(), page.brands.map((b) => b.brand));
  return <WeightLadderChart tiers={tiers} mode={{ kind: "page", initial, ...page }} />;
}

export default function WeightLadderChart({ tiers, mode }: { tiers: WeightTier[]; mode: Mode }) {
  const t = useTranslations("Charts");
    const tBrand = useTranslations("Brands");
  const { selected, select } = useChartSelection(mode.kind === "page" ? mode.initial : mode.selection);
  const { itemHandlers, sheet } = useChartCard();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const cls = LAYOUT[mode.kind];
  const heaviest = Math.max(...tiers.flatMap((tier) => tier.lenses.map((l) => l.weightG)));
  const filtering = Boolean(selected.brand);
  const sheetLens = tiers.flatMap((tier) => tier.lenses).find((l) => l.id === sheet.id);

  const range = (tier: WeightTier) =>
    tier.maxG === undefined
      ? t("rangeAtLeast", { min: tier.minG })
      : tier.minG === 0
        ? t("rangeUnder", { max: tier.maxG })
        : t("rangeBetween", { min: tier.minG, max: tier.maxG - 1 });

  return (
    <div className={cn("flex flex-col", cls.list)}>
      {mode.kind === "page" && (
        <div className="flex flex-col gap-2">
          <ChartChips
            label={t("filterBrand")}
            labelShown={false}
            chips={mode.brands.map((b) => ({ key: b.brand, label: `${brandLabel(tBrand, b.brand)} ${b.count}` }))}
            selected={selected.brand}
            onSelect={(brand) => select({ ...selected, brand })}
          />
          {selected.brand && (
            <Link href={brandPath(mode.mount, selected.brand)} className={cn(TEXT_LINK_CLS, "self-start text-sm")}>
              {t("seeBrand", {
                brand: brandLabel(tBrand, selected.brand),
                count: mode.brands.find((b) => b.brand === selected.brand)?.count ?? 0,
              })}
            </Link>
          )}
        </div>
      )}

      {tiers.map((tier) => {
        const lenses = tier.lenses.filter((lens) => matchesChartSelection(lens, selected));
        const collapsed = mode.kind === "page" && !(expanded[tier.key] ?? false);
        const hidden = lenses.length - PHONE_TIER_PREVIEW;
        const headingId = mode.kind === "page" ? `tier-${tier.key}` : undefined;
        return (
          <section key={tier.key} aria-labelledby={headingId} className={cls.section}>
            <header className={cls.header}>
              <h2 id={headingId} className={cls.name}>
                {t(`tier-${tier.key}`)}
              </h2>
              <span className={cn("tabular-nums text-zinc-700", cls.detail)}>{range(tier)}</span>
              <span className={cn("text-zinc-500", cls.detail)}>
                {mode.kind === "page" && filtering
                  ? t("filteredCount", { shown: lenses.length, total: tier.lenses.length })
                  : t("lensCount", { count: lenses.length })}
              </span>
              <span className={cn("w-full text-zinc-600", cls.detail)}>{t(`tier-${tier.key}-tagline`)}</span>
            </header>
            {lenses.length > 0 && (
              <div>
                <ul className={cls.grid}>
                  {lenses.map((lens, i) => (
                    <li key={lens.id} className={cn(collapsed && i >= PHONE_TIER_PREVIEW && "max-md:hidden")}>
                      <LadderTile
                        lens={lens}
                        barPct={weightBarPct(lens.weightG, heaviest)}
                        handlers={mode.kind === "page" ? itemHandlers(lens.id) : undefined}
                        cls={cls}
                      />
                    </li>
                  ))}
                </ul>
                {collapsed && hidden > 0 && (
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

      {mode.kind === "page" && <ChartLensSheet lens={sheetLens} open={sheet.open} onOpenChange={sheet.onOpenChange} />}
    </div>
  );
}

// Mouse users get the actions on the tile; touch has no hover, so a tap opens the lens sheet instead
// and the tile only marks what is already favorited or compared.
function LadderTile({
  lens,
  barPct,
  handlers,
  cls,
}: {
  lens: ChartLens;
  barPct: number;
  handlers: ChartItemHandlers | undefined;
  cls: (typeof LAYOUT)[keyof typeof LAYOUT];
}) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const compare = useCompareToggle(lens);
  const favorited = useFavorites().isFavorite(lens.id);
  const name = `${brandLabel(tBrand, lens.brand)} ${lens.model}`;

  return (
    <div className={cn("group relative flex h-full flex-col gap-0.5", cls.tile)}>
      {handlers && <ChartLensItem lens={lens} handlers={handlers} className="absolute inset-0 z-0 rounded-xl" />}
      <Image src={getLensImageUrl(lens.id)} alt="" width={104} height={104} loading={handlers ? "lazy" : "eager"} className="pointer-events-none aspect-square w-full object-contain" />
      <span className={cn("pointer-events-none truncate uppercase tracking-[0.12em] text-zinc-500", cls.tileBrand)}>{brandLabel(tBrand, lens.brand)}</span>
      <span className={cn("pointer-events-none line-clamp-2 text-zinc-900", cls.tileModel)}>{lens.model}</span>
      <span className="pointer-events-none flex items-center gap-1.5">
        <span className={cn("font-bold tabular-nums text-zinc-900", cls.tileWeight)}>{t("weight", { weight: lens.weightG })}</span>
        <span className="flex h-1 flex-1 overflow-hidden rounded bg-zinc-100" aria-hidden="true">
          <span className="rounded bg-zinc-900" style={{ width: `${barPct}%` }} />
        </span>
      </span>
      {handlers && (
        <>
          <LensActions lensId={lens.id} lensName={name} compare={compare} tier="dense" />
          {compare.selected && (
            <span className="pointer-events-none absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white pointer-fine:hidden" aria-hidden="true">
              <Check className="size-3" strokeWidth={3} />
            </span>
          )}
          {favorited && (
            <Star className="pointer-events-none absolute right-1.5 top-1.5 size-4 fill-zinc-900 stroke-white text-zinc-900 pointer-fine:hidden" aria-hidden="true" />
          )}
        </>
      )}
    </div>
  );
}
