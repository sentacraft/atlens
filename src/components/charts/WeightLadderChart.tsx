"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Apple, Banana, Check, CupSoda, Egg, GlassWater, Milk, Plus, SoapDispenserDroplet, Star, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ChartChips from "@/components/charts/ChartChips";
import ChartLensItem from "@/components/charts/ChartLensItem";
import ChartLensSheet from "@/components/charts/ChartLensSheet";
import FavoriteStarButton from "@/components/lens/FavoriteStarButton";
import { HOVER_REVEAL_CLS, PAGE_SECTION_HEADING_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { useChartCard, type ChartItemHandlers } from "@/hooks/useChartCard";
import { useChartSelection } from "@/hooks/useChartSelection";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import { useFavorites } from "@/hooks/useFavorites";
import { matchesChartSelection, type BrandCount } from "@/lib/charts/catalog";
import { weightBarPct, type LadderRow, type WeightReference, type WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import type { Mount } from "@/lib/types";
import { brandPath } from "@/lib/url/routes";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import { cn } from "@/lib/utils";

const PHONE_TIER_PREVIEW = 6;

const REFERENCE_ICONS: Record<WeightReference["key"], LucideIcon> = {
  cola2l: CupSoda,
  water750: GlassWater,
  water500: GlassWater,
  colaCan: CupSoda,
  milk250: Milk,
  apple: Apple,
  banana: Banana,
  soap: SoapDispenserDroplet,
  egg: Egg,
};

// A poster is rasterized at a fixed width, so it takes one layout whatever the screen.
const LAYOUT = {
  page: {
    list: "gap-6",
    section: "border-t border-zinc-200 pt-4 md:grid md:grid-cols-[176px_1fr] md:gap-4",
    header: "mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:mb-0 md:flex-col md:gap-1",
    name: PAGE_SECTION_HEADING_CLS,
    detail: "text-xs",
    rows: "flex flex-col",
    row: "h-12 gap-2 sm:gap-3",
    rank: "w-6 text-[11px] sm:w-8",
    image: "size-9 sm:size-10",
    brand: "text-[9px]",
    model: "text-[13px]",
    bar: "w-[34%] sm:w-[38%]",
    weight: "text-[13px]",
    reference: "h-9 text-xs",
  },
  poster: {
    list: "gap-7",
    section: "flex flex-col gap-2",
    header: "flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-zinc-200 pb-2",
    name: "font-heading text-[28px] font-bold text-zinc-900",
    detail: "text-base",
    rows: "columns-2 gap-x-10",
    row: "h-14 gap-3 break-inside-avoid",
    rank: "w-8 text-xs",
    image: "size-11",
    brand: "text-[10px]",
    model: "text-sm",
    bar: "w-[34%]",
    weight: "text-sm",
    reference: "h-10 text-sm break-inside-avoid",
  },
} as const;

type Layout = (typeof LAYOUT)[keyof typeof LAYOUT];

type PageProps = { mount: Mount; tiers: WeightTier[]; brands: BrandCount[] };

/** `page`: the ladder with its brand filter. `poster`: every tier at a fixed width, filtered, with nothing to click. */
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
        const rows = tier.rows.filter((row) => row.kind === "reference" || matchesChartSelection(row.lens, selected));
        const lensCount = rows.filter((row) => row.kind === "lens").length;
        const collapsed = mode.kind === "page" && !(expanded[tier.key] ?? false);
        const headingId = mode.kind === "page" ? `tier-${tier.key}` : undefined;
        let lensIndex = 0;
        return (
          <section key={tier.key} aria-labelledby={headingId} className={cls.section}>
            <header className={cls.header}>
              <h2 id={headingId} className={cls.name}>
                {t(`tier-${tier.key}`)}
              </h2>
              <span className={cn("tabular-nums text-zinc-700", cls.detail)}>{range(tier)}</span>
              <span className={cn("text-zinc-500", cls.detail)}>
                {mode.kind === "page" && filtering
                  ? t("filteredCount", { shown: lensCount, total: tier.lenses.length })
                  : t("lensCount", { count: lensCount })}
              </span>
              <span className={cn("w-full text-zinc-600", cls.detail)}>{t(`tier-${tier.key}-tagline`)}</span>
            </header>
            <div className="min-w-0">
              <ol className={cls.rows}>
                {rows.map((row) => {
                  if (row.kind === "reference") {
                    return <ReferenceRow key={row.reference.key} reference={row.reference} cls={cls} />;
                  }
                  const hidden = collapsed && lensIndex++ >= PHONE_TIER_PREVIEW;
                  return (
                    <li key={row.lens.id} className={cn(hidden && "max-md:hidden")}>
                      <LensRow
                        row={row}
                        barPct={weightBarPct(row.lens.weightG, heaviest)}
                        handlers={mode.kind === "page" ? itemHandlers(row.lens.id) : undefined}
                        cls={cls}
                      />
                    </li>
                  );
                })}
              </ol>
              {collapsed && lensCount > PHONE_TIER_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [tier.key]: true }))}
                  className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-700 md:hidden"
                >
                  {t("showAll", { count: lensCount })}
                </button>
              )}
            </div>
          </section>
        );
      })}

      {mode.kind === "page" && <ChartLensSheet lens={sheetLens} open={sheet.open} onOpenChange={sheet.onOpenChange} />}
    </div>
  );
}

function ReferenceRow({ reference, cls }: { reference: WeightReference; cls: Layout }) {
  const t = useTranslations("Charts");
  const Icon = REFERENCE_ICONS[reference.key];
  return (
    <li
      className={cn(
        "my-1 flex items-center gap-2 border-y border-dashed border-amber-300 bg-amber-50 px-2 text-amber-900",
        cls.reference,
      )}
    >
      <Icon className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
      <span className="truncate font-medium">{t(`ref-${reference.key}`)}</span>
      <span className="shrink-0 tabular-nums text-amber-700">{t("refWeight", { weight: reference.weightG })}</span>
    </li>
  );
}

// Mouse users get the actions on the row; touch has no hover, so a tap opens the lens sheet instead
// and the row only marks what is already favorited or compared.
function LensRow({
  row,
  barPct,
  handlers,
  cls,
}: {
  row: Extract<LadderRow, { kind: "lens" }>;
  barPct: number;
  handlers: ChartItemHandlers | undefined;
  cls: Layout;
}) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const { lens, rank } = row;
  const compare = useCompareToggle(lens.id);
  const favorited = useFavorites().isFavorite(lens.id);
  const name = `${brandLabel(tBrand, lens.brand)} ${lens.model}`;

  return (
    <div className={cn("group relative flex items-center border-b border-zinc-100", cls.row)}>
      {handlers && <ChartLensItem lens={lens} handlers={handlers} className="absolute inset-0 z-0 rounded-md hover:bg-zinc-50" />}
      <span className={cn("pointer-events-none relative shrink-0 text-right tabular-nums text-zinc-400", cls.rank)}>{rank}</span>
      <Image src={getLensImageUrl(lens.id)} alt="" width={48} height={48} loading={handlers ? "lazy" : "eager"} className={cn("pointer-events-none relative shrink-0 object-contain", cls.image)} />
      <span className="pointer-events-none relative flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate uppercase tracking-[0.12em] text-zinc-500", cls.brand)}>{brandLabel(tBrand, lens.brand)}</span>
        <span className={cn("truncate text-zinc-900", cls.model)}>{lens.model}</span>
      </span>
      <span className={cn("pointer-events-none relative flex shrink-0 items-center gap-1.5", cls.bar)}>
        <span className="h-1.5 rounded-full bg-zinc-900" style={{ width: `${barPct * 0.62}%` }} aria-hidden="true" />
        <span className={cn("shrink-0 font-semibold tabular-nums text-zinc-900", cls.weight)}>{t("weight", { weight: lens.weightG })}</span>
      </span>
      {handlers && (
        <span className="relative flex shrink-0 items-center gap-1 pointer-coarse:hidden">
          <button
            type="button"
            onClick={compare.onToggle}
            aria-pressed={compare.selected}
            aria-label={`${compare.label}: ${name}`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full border shadow-sm transition-[opacity,background-color,color]",
              compare.stateCls,
              !compare.selected && HOVER_REVEAL_CLS,
            )}
          >
            {compare.selected ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
          </button>
          <FavoriteStarButton lensId={lens.id} placement="overlay" className="h-7 w-7" />
        </span>
      )}
      {handlers && (compare.selected || favorited) && (
        <span className="pointer-events-none relative flex shrink-0 items-center gap-1 pointer-fine:hidden" aria-hidden="true">
          {compare.selected && (
            <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white">
              <Check className="size-3" strokeWidth={3} />
            </span>
          )}
          {favorited && <Star className="size-4 fill-zinc-900 text-zinc-900" />}
        </span>
      )}
    </div>
  );
}
