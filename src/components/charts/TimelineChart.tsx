"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import ChartLensCard from "@/components/charts/ChartLensCard";
import ChartLensItem from "@/components/charts/ChartLensItem";
import ChartLensSheet from "@/components/charts/ChartLensSheet";
import ChartChips from "@/components/charts/ChartChips";
import ChartFocusPill from "@/components/charts/ChartFocusPill";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";
import { useChartCard, type ChartItemHandlers } from "@/hooks/useChartCard";
import { useChartSelection } from "@/hooks/useChartSelection";
import { useScrollToFocused } from "@/hooks/useScrollToFocused";
import { assignLanes, fitItemSize, LANE_GAP, LANE_STEP, laneOffset, type TimelineEntry, type TimelineYear } from "@/lib/charts/timeline";
import { isChartZoom, type BrandCount, type ChartLens } from "@/lib/charts/catalog";
import { logFrac, pct } from "@/lib/charts/scale";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { SITE } from "@/config/site";
import { TEXT_LINK_CLS } from "@/config/ui-tokens";
import type { Mount } from "@/lib/types";
import { brandPath } from "@/lib/url/routes";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import { cn } from "@/lib/utils";

// A phone has no room for 15 year columns, so the same chart scrolls sideways there instead.
// plotWidth is the plot's nominal width at that breakpoint, which sizes the lens images.
const GEOMETRY = {
  wide: { height: 720, sectionHeight: 480, padTop: 16, padBottom: 48, plotWidth: 1040, size: { min: 40, max: 88 } },
  poster: { height: 720, sectionHeight: 720, padTop: 16, padBottom: 48, plotWidth: 920, size: { min: 40, max: 128 } },
  compact: { height: 420, sectionHeight: 340, padTop: 24, padBottom: 40, plotWidth: 300, size: { min: 28, max: 48 }, scrollSize: 30, minColWidth: 56 },
} as const;
const WIDE_PAD = { left: 52, right: 12 };
const COMPACT_AXIS_WIDTH = 28;
const TICKS = [8, 16, 23, 35, 56, 90, 200, 400];
const DIM = 0.08;
const FOCUS_DIM = 0.3;

type PageProps = {
  mount: Mount;
  entries: TimelineEntry[];
  years: TimelineYear[];
  /** Brands with dated lenses, for the highlight chips. */
  brands: BrandCount[];
  /** Every brand's full lens count, for the link to the highlighted brand's page. */
  brandTotals: BrandCount[];
};

/**
 * `page`: the all-brand chart with its highlight chips and a link to the highlighted brand's page.
 * `section`: one brand's chart inside its page, no controls. `poster`: rasterized at a fixed width,
 * so the wide layout only, with nothing to click.
 */
type Mode =
  | ({ kind: "page"; initial: ChartSelection } & Pick<PageProps, "mount" | "brands" | "brandTotals">)
  | { kind: "section" }
  | { kind: "poster"; highlight?: string };

export function TimelineChartFromUrl({ entries, years, ...page }: PageProps) {
  const initial = readChartSelectionFromSearch(useSearchParams(), {
    brands: page.brands.map((b) => b.brand),
    lenses: entries.map((e) => e.lens.id),
  });
  return <TimelineChart entries={entries} years={years} mode={{ kind: "page", initial, ...page }} />;
}

type Geometry = (typeof GEOMETRY)[keyof typeof GEOMETRY];

function useLayout(entries: TimelineEntry[], years: TimelineYear[], geometry: Geometry, height: number) {
  return useMemo(() => {
    const lows = entries.map((e) => e.lens.focalMin);
    const highs = entries.map((e) => e.lens.focalMax);
    const fMin = Math.min(...lows) * 0.85;
    const fMax = Math.max(...highs) * 1.15;
    const ph = height - geometry.padTop - geometry.padBottom;
    const y = (f: number) => Math.round(geometry.padTop + (1 - logFrac(f, fMin, fMax)) * ph);
    const byYear = years.map((yr) => entries.filter((e) => e.year === yr.year));
    // A phone fits a few years on screen; more than that, the chart scrolls and each year takes the room its lanes need.
    const scrolls = "minColWidth" in geometry && years.length * geometry.minColWidth > geometry.plotWidth;
    const size = scrolls
      ? geometry.scrollSize
      : fitItemSize(byYear.map((row) => row.map((e) => y(e.focalMid))), geometry.plotWidth / years.length, geometry.size);
    const step = size * LANE_STEP;
    const rows = byYear.map((row, col) => {
      const lanes = assignLanes(row, (e) => y(e.focalMid), size * LANE_GAP);
      return row.map((e, i) => ({ e, col, lane: lanes[i], y: y(e.focalMid), yMin: y(e.lens.focalMin), yMax: y(e.lens.focalMax) }));
    });
    const widths = rows.map((row) =>
      scrolls ? Math.max(geometry.minColWidth, 2 * Math.abs(laneOffset(Math.max(0, ...row.map((p) => p.lane)), step)) + size + 12) : 1,
    );
    const total = widths.reduce((a, b) => a + b, 0);
    let start = 0;
    const cols = widths.map((w) => {
      const col = { start: start / total, width: w / total, center: (start + w / 2) / total };
      start += w;
      return col;
    });
    return { size, step, placed: rows.flat(), cols, total, ticks: TICKS.filter((f) => f > fMin && f < fMax).map((f) => ({ f, y: y(f) })) };
  }, [entries, years, geometry, height]);
}

type Layout = ReturnType<typeof useLayout>;

export default function TimelineChart({ mode, entries, years }: { mode: Mode; entries: TimelineEntry[]; years: TimelineYear[] }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const { selected, shown, select, setPreview } = useChartSelection(
    mode.kind === "page" ? mode.initial : { brand: mode.kind === "poster" ? mode.highlight : undefined },
  );
  const { active, itemHandlers, sheet } = useChartCard();
  const handlers = (lens: ChartLens) => (mode.kind === "poster" ? undefined : itemHandlers(lens.id));
  // One brand has few lenses; the full height would leave the section mostly empty.
  const heightOf = (geometry: Geometry) => (mode.kind === "section" ? geometry.sectionHeight : geometry.height);
  const wideGeometry = mode.kind === "poster" ? GEOMETRY.poster : GEOMETRY.wide;
  const wideHeight = heightOf(wideGeometry);
  const compactHeight = heightOf(GEOMETRY.compact);
  const wide = useLayout(entries, years, wideGeometry, wideHeight);
  const compact = useLayout(entries, years, GEOMETRY.compact, compactHeight);

  const focus = mode.kind === "page" ? entries.find((e) => e.lens.id === shown.lens) : undefined;
  const focusName = focus ? `${brandLabel(tBrand, focus.lens.brand)} ${focus.lens.model}` : undefined;
  const root = useRef<HTMLDivElement>(null);
  useScrollToFocused(root, focus?.lens.id);
  const dimmed = (lens: ChartLens) =>
    focus ? (lens.id === focus.lens.id ? 1 : FOCUS_DIM) : shown.brand && lens.brand !== shown.brand ? DIM : 1;
  const activeEntry = entries.find((e) => e.lens.id === active);
  const sheetEntry = entries.find((e) => e.lens.id === sheet.id);
  const activeWide = wide.placed.find((p) => p.e.lens.id === active);
  const wideCardOffset = (p: Layout["placed"][number]) => {
    const x = laneOffset(p.lane, wide.step);
    const gap = wide.size / 2 + 16;
    return wide.cols[p.col].center > 0.6 ? x - 288 - gap : x + gap;
  };
  const plot = {
    years,
    dimmed,
    handlers,
    active,
    focus: focus && focusName ? { id: focus.lens.id, name: focusName } : undefined,
    eager: mode.kind === "poster",
    yearLabel: (count: number) => t("lensCount", { count }),
  };
  const tickLabels = (layout: Layout, width: string, unit: "each" | "once") => (
    <>
      {unit === "once" && <span className="absolute left-0 top-0 z-20 whitespace-nowrap text-[10px] text-zinc-400">{t("focalAxis")}</span>}
      {layout.ticks.map(({ f, y }) => (
        <span key={f} className={cn("absolute left-0 text-right text-[11px] tabular-nums text-zinc-500", width)} style={{ top: y - 8 }}>
          {unit === "each" ? `${f}mm` : f}
        </span>
      ))}
    </>
  );

  return (
    <div ref={root} className="flex flex-col gap-4">
      {mode.kind === "page" && (
        <>
          <ChartChips
            label={t("highlightBrand")}
            labelShown
            chips={mode.brands.map((b) => ({ key: b.brand, label: `${brandLabel(tBrand, b.brand)} ${b.count}` }))}
            selected={selected.brand}
            onPreview={(brand) => setPreview({ brand })}
            onSelect={(brand) => select({ brand })}
          />
          {selected.brand && (
            <Link href={brandPath(mode.mount, selected.brand)} className={cn(TEXT_LINK_CLS, "self-start text-sm")}>
              {t("seeBrand", {
                brand: brandLabel(tBrand, selected.brand),
                count: mode.brandTotals.find((b) => b.brand === selected.brand)?.count ?? 0,
              })}
            </Link>
          )}
          {focus && focusName && (
            <ChartFocusPill
              label={t("focusTimeline", { name: focusName, year: String(focus.year) })}
              onClear={() => select({ ...selected, lens: undefined })}
            />
          )}
        </>
      )}

      <div className={cn("relative", mode.kind !== "poster" && "hidden md:block")} style={{ height: wideHeight }}>
        {tickLabels(wide, "w-11", "each")}
        {mode.kind === "poster" && <span className="absolute bottom-2 left-0 text-[11px] text-zinc-400">{SITE.host}</span>}
        <div className="absolute inset-y-0" style={{ left: WIDE_PAD.left, right: WIDE_PAD.right }}>
          <TimelinePlot {...plot} layout={wide} geometry={wideGeometry} height={wideHeight}>
            {activeEntry && activeWide && (
              <ChartLensCard
                lens={activeEntry.lens}
                className="absolute z-30"
                style={{
                  top: Math.max(0, Math.min(activeWide.y - 56, wideHeight - 140)),
                  left: pct(wide.cols[activeWide.col].center),
                  marginLeft: wideCardOffset(activeWide),
                }}
              />
            )}
          </TimelinePlot>
        </div>
      </div>

      {mode.kind !== "poster" && (
        <div className="relative md:hidden" style={{ height: compactHeight }}>
          {tickLabels(compact, "w-6", "once")}
          <HorizontalScrollRail
            wrapperClassName="absolute inset-y-0 right-0"
            wrapperStyle={{ left: COMPACT_AXIS_WIDTH }}
            fadeBg="from-white from-40%"
            renderOverlay={({ canScrollLeft, canScrollRight }) => (
              <>
                <ScrollHint side="left" visible={canScrollLeft} />
                <ScrollHint side="right" visible={canScrollRight} />
              </>
            )}
          >
            <div className="relative shrink-0" style={{ width: compact.total, minWidth: "100%", height: compactHeight }}>
              <TimelinePlot {...plot} layout={compact} geometry={GEOMETRY.compact} height={compactHeight} />
            </div>
          </HorizontalScrollRail>
        </div>
      )}
      {mode.kind !== "poster" && <ChartLensSheet lens={sheetEntry?.lens} open={sheet.open} onOpenChange={sheet.onOpenChange} />}
    </div>
  );
}

/** A small double chevron inside the rail's edge fade, marking the side with more years. */
function ScrollHint({ side, visible }: { side: "left" | "right"; visible: boolean }) {
  const Icon = side === "left" ? ChevronsLeft : ChevronsRight;
  return (
    <Icon
      aria-hidden="true"
      data-scroll-hint={side}
      className={cn(
        "pointer-events-none absolute top-1/2 z-10 size-4 -translate-y-1/2 text-zinc-500 transition-opacity",
        side === "left" ? "left-0.5" : "right-0.5",
        visible ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

/** Year columns across, focal length up the side, inside a box whose width sets the columns. */
function TimelinePlot({
  layout,
  geometry,
  height,
  years,
  dimmed,
  handlers,
  active,
  focus,
  eager,
  yearLabel,
  children,
}: {
  layout: Layout;
  geometry: Geometry;
  height: number;
  years: TimelineYear[];
  dimmed: (lens: ChartLens) => number;
  handlers: (lens: ChartLens) => ChartItemHandlers | undefined;
  active: string | undefined;
  /** The lens a link opened the chart on, outlined and named. */
  focus: { id: string; name: string } | undefined;
  eager: boolean;
  yearLabel: (count: number) => string;
  children?: React.ReactNode;
}) {
  const { cols, size, step: laneStep } = layout;
  return (
    <>
      {years.map((yr, col) =>
        col % 2 === 0 ? (
          <div
            key={yr.year}
            className="absolute bg-zinc-50"
            style={{ left: pct(cols[col].start), width: pct(cols[col].width), top: geometry.padTop, bottom: geometry.padBottom }}
          />
        ) : null,
      )}
      {layout.ticks.map(({ f, y }) => (
        <div key={f} className="absolute inset-x-0 h-px bg-zinc-100" style={{ top: y }} />
      ))}
      {years.map((yr, col) => (
        <div
          key={yr.year}
          className="absolute flex -translate-x-1/2 flex-col items-center"
          style={{ left: pct(cols[col].center), top: height - geometry.padBottom + 8 }}
        >
          <span className="text-xs font-semibold tabular-nums text-zinc-900">{yr.year}</span>
          <span className="whitespace-nowrap text-[11px] tabular-nums text-zinc-500">{yearLabel(yr.count)}</span>
        </div>
      ))}
      {layout.placed.map(({ e, col, lane, yMin, yMax }) =>
        isChartZoom(e.lens) ? (
          <div
            key={`bar-${e.lens.id}`}
            aria-hidden="true"
            className="absolute w-1.5 rounded bg-zinc-900/15 transition-opacity"
            style={{
              left: pct(cols[col].center),
              marginLeft: laneOffset(lane, laneStep) - 3,
              top: yMax,
              height: yMin - yMax,
              opacity: dimmed(e.lens),
            }}
          />
        ) : null,
      )}
      {layout.placed.map(({ e, col, lane, y }) => (
        <ChartLensItem
          key={e.lens.id}
          lens={e.lens}
          handlers={handlers(e.lens)}
          focused={focus?.id === e.lens.id}
          className={cn(
            "absolute block transition-[opacity,transform] duration-150",
            active === e.lens.id ? "z-20 scale-150" : "z-10",
            focus?.id === e.lens.id && "z-20 rounded-full ring-2 ring-zinc-900 ring-offset-2 ring-offset-white",
          )}
          style={{
            left: pct(cols[col].center),
            marginLeft: laneOffset(lane, laneStep) - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            opacity: dimmed(e.lens),
          }}
        >
          <Image src={getLensImageUrl(e.lens.id)} alt="" width={size} height={size} loading={eager ? "eager" : "lazy"} className="size-full object-contain drop-shadow-sm" />
        </ChartLensItem>
      ))}
      {layout.placed.map(({ e, col, lane, y }) =>
        focus?.id === e.lens.id ? (
          <span
            key={`focus-${e.lens.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] text-white"
            style={{ left: pct(cols[col].center), marginLeft: laneOffset(lane, laneStep), top: y - size / 2 - 26 }}
          >
            {focus.name}
          </span>
        ) : null,
      )}
      {children}
    </>
  );
}
