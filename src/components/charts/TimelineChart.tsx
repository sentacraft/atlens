"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ChartLensCard from "@/components/charts/ChartLensCard";
import ChartChips from "@/components/charts/ChartChips";
import { useChartCard } from "@/hooks/useChartCard";
import { useChartSelection } from "@/hooks/useChartSelection";
import { assignLanes, type TimelineEntry, type TimelineYear } from "@/lib/charts/timeline";
import { isChartZoom, type BrandCount, type ChartLens } from "@/lib/charts/catalog";
import { logFrac, pct } from "@/lib/charts/scale";
import { brandLabel, focalRangeDisplay } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { TEXT_LINK_CLS } from "@/config/ui-tokens";
import type { Mount } from "@/lib/types";
import { lensPath, brandPath } from "@/lib/url/routes";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import { cn } from "@/lib/utils";

const WIDE = { height: 720, sectionHeight: 480, padTop: 16, padBottom: 48, padLeft: 52, padRight: 12, size: 40, laneStep: 22 };
const TALL = { rowLabel: 24, size: 30, rowGap: 4, rowPad: 10, laneGapFrac: 0.09 };
const TICKS = [8, 15, 24, 35, 50, 85, 135, 200, 300, 600];
const TALL_TICKS = [15, 35, 85, 200, 600];
const DIM = 0.08;

type Props = {
  /**
   * `page`: the all-brand chart with its highlight chips and a link to the highlighted brand's page.
   * `section`: one brand's chart inside its page, no controls. `poster`: rasterized at a fixed
   * width, so the wide chart only, with brand counts under it.
   */
  mode: { kind: "page"; brandTotals: BrandCount[] } | { kind: "section" } | { kind: "poster" };
  mount: Mount;
  entries: TimelineEntry[];
  years: TimelineYear[];
  brands: BrandCount[];
};

function laneOffset(lane: number, step: number): number {
  return lane === 0 ? 0 : (lane % 2 === 1 ? -1 : 1) * Math.ceil(lane / 2) * step;
}

export function TimelineChartFromUrl(props: Props) {
  const { brand } = readChartSelectionFromSearch(useSearchParams(), props.brands.map((b) => b.brand));
  return <TimelineChart {...props} initial={{ brand }} />;
}

export default function TimelineChart({ mode, mount, entries, years, brands, initial }: Props & { initial: ChartSelection }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const { selected, shown, select, setPreview } = useChartSelection(initial);
  const { active, itemHandlers } = useChartCard();
  // One brand has few lenses; the full height would leave the section mostly empty.
  const wideHeight = mode.kind === "section" ? WIDE.sectionHeight : WIDE.height;

  const [fMin, fMax] = useMemo(() => {
    const lows = entries.map((e) => e.lens.focalMin);
    const highs = entries.map((e) => e.lens.focalMax);
    return [Math.min(...lows) * 0.85, Math.max(...highs) * 1.15];
  }, [entries]);
  const frac = (f: number) => logFrac(f, fMin, fMax);

  const wide = useMemo(() => {
    const ph = wideHeight - WIDE.padTop - WIDE.padBottom;
    const y = (f: number) => Math.round(WIDE.padTop + (1 - logFrac(f, fMin, fMax)) * ph);
    const placed = years.flatMap((yr, col) => {
      const row = entries.filter((e) => e.year === yr.year);
      const lanes = assignLanes(row, (e) => y(e.focalMid), WIDE.size * 0.82);
      return row.map((e, i) => ({ e, col, lane: lanes[i], y: y(e.focalMid), yMin: y(e.lens.focalMin), yMax: y(e.lens.focalMax) }));
    });
    return { placed, ticks: TICKS.filter((f) => f > fMin && f < fMax).map((f) => ({ f, y: y(f) })) };
  }, [entries, years, fMin, fMax, wideHeight]);

  const tall = useMemo(() => {
    let top = TALL.rowLabel;
    const rows = [...years].reverse().map((yr) => {
      const row = entries.filter((e) => e.year === yr.year);
      const lanes = assignLanes(row, (e) => logFrac(e.focalMid, fMin, fMax), TALL.laneGapFrac);
      const laneCount = Math.max(1, ...lanes.map((l) => l + 1));
      const height = TALL.rowLabel + laneCount * (TALL.size + TALL.rowGap) + TALL.rowPad;
      const placed = row.map((e, i) => ({ e, lane: lanes[i], top: top + TALL.rowLabel + lanes[i] * (TALL.size + TALL.rowGap) }));
      const out = { yr, top, height, placed };
      top += height;
      return out;
    });
    return { rows, height: top };
  }, [entries, years, fMin, fMax]);

  const dimmed = (lens: ChartLens) => (shown.brand && lens.brand !== shown.brand ? DIM : 1);
  const spec = (e: TimelineEntry) =>
    [
      t("released", { year: String(e.year) }),
      t("equivFocal", { focal: focalRangeDisplay(e.lens.focalMin, e.lens.focalMax) }),
      t("weight", { weight: e.lens.weightG }),
    ].join(" · ");

  const activeEntry = entries.find((e) => e.lens.id === active);
  const n = years.length;
  const colFrac = (col: number) => (col + 0.5) / n;
  const activeWide = wide.placed.find((p) => p.e.lens.id === active);
  const activeTall = tall.rows.flatMap((r) => r.placed).find((p) => p.e.lens.id === active);
  const wideCardOffset = (p: (typeof wide.placed)[number]) => {
    const x = laneOffset(p.lane, WIDE.laneStep);
    return colFrac(p.col) > 0.6 ? x - 288 - 36 : x + 36;
  };

  return (
    <div className="flex flex-col gap-4">
      {mode.kind === "page" && (
        <>
          <ChartChips
            label={t("highlightBrand")}
            chips={brands.map((b) => ({ key: b.brand, label: `${brandLabel(tBrand, b.brand)} ${b.count}` }))}
            selected={selected.brand}
            onPreview={(brand) => setPreview({ brand })}
            onSelect={(brand) => select({ brand })}
          />
          {selected.brand && (
            <Link href={brandPath(mount, selected.brand)} className={cn(TEXT_LINK_CLS, "self-start text-sm")}>
              {t("seeBrand", {
                brand: brandLabel(tBrand, selected.brand),
                count: mode.brandTotals.find((b) => b.brand === selected.brand)?.count ?? 0,
              })}
            </Link>
          )}
        </>
      )}

      {/* Wide layout: years across, focal length up the side. */}
      <div className={cn("relative", mode.kind !== "poster" && "hidden md:block")} style={{ height: wideHeight }}>
        {wide.ticks.map(({ f, y }) => (
          <span key={f} className="absolute left-0 w-11 text-right text-[11px] tabular-nums text-zinc-500" style={{ top: y - 8 }}>
            {f}mm
          </span>
        ))}
        <div className="absolute inset-y-0" style={{ left: WIDE.padLeft, right: WIDE.padRight }}>
          {years.map((yr, col) =>
            col % 2 === 0 ? (
              <div
                key={yr.year}
                className="absolute bg-zinc-50"
                style={{ left: pct(col / n), width: pct(1 / n), top: WIDE.padTop, bottom: WIDE.padBottom }}
              />
            ) : null,
          )}
          {wide.ticks.map(({ f, y }) => (
            <div key={f} className="absolute inset-x-0 h-px bg-zinc-100" style={{ top: y }} />
          ))}
          {years.map((yr, col) => (
            <div
              key={yr.year}
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: pct(colFrac(col)), top: wideHeight - WIDE.padBottom + 8 }}
            >
              <span className="text-xs font-semibold tabular-nums text-zinc-900">{yr.year}</span>
              <span className="text-[11px] tabular-nums text-zinc-500">{t("lensCount", { count: yr.count })}</span>
            </div>
          ))}
          {wide.placed.map(({ e, col, lane, yMin, yMax }) =>
            isChartZoom(e.lens) ? (
              <div
                key={`bar-${e.lens.id}`}
                aria-hidden="true"
                className="absolute w-1.5 rounded bg-zinc-900/15 transition-opacity"
                style={{
                  left: pct(colFrac(col)),
                  marginLeft: laneOffset(lane, WIDE.laneStep) - 3,
                  top: yMax,
                  height: yMin - yMax,
                  opacity: dimmed(e.lens),
                }}
              />
            ) : null,
          )}
          {wide.placed.map(({ e, col, lane, y }) => (
            <Link
              key={e.lens.id}
              href={lensPath(e.lens)}
              aria-label={`${brandLabel(tBrand, e.lens.brand)} ${e.lens.model}`}
              {...itemHandlers(e.lens.id)}
              className={cn("absolute block transition-[opacity,transform] duration-150", active === e.lens.id ? "z-20 scale-150" : "z-10")}
              style={{
                left: pct(colFrac(col)),
                marginLeft: laneOffset(lane, WIDE.laneStep) - WIDE.size / 2,
                top: y - WIDE.size / 2,
                width: WIDE.size,
                height: WIDE.size,
                opacity: dimmed(e.lens),
              }}
            >
              <Image src={getLensImageUrl(e.lens.id)} alt="" width={WIDE.size} height={WIDE.size} loading={mode.kind === "poster" ? "eager" : "lazy"} className="size-full object-contain drop-shadow-sm" />
            </Link>
          ))}
          {activeEntry && activeWide && (
            <ChartLensCard
              lens={activeEntry.lens}
              spec={spec(activeEntry)}
              className="absolute z-30"
              style={{
                top: Math.max(0, Math.min(activeWide.y - 56, wideHeight - 140)),
                left: pct(colFrac(activeWide.col)),
                marginLeft: wideCardOffset(activeWide),
              }}
            />
          )}
        </div>
      </div>

      {mode.kind !== "poster" && (
        <>
          {/* Tall layout for phones: one row per year, newest first, focal length across. */}
          <div className="relative md:hidden" style={{ height: tall.height + 40 }}>
            {tall.rows.map(({ yr, top, height }, i) => (
              <Fragment key={yr.year}>
                {i % 2 === 0 && <div className="absolute inset-x-0 bg-zinc-50" style={{ top, height }} />}
                <div className="absolute left-2.5 flex items-baseline gap-1.5" style={{ top: top + 4 }}>
                  <span className="text-xs font-semibold tabular-nums text-zinc-900">{yr.year}</span>
                  <span className="text-[11px] tabular-nums text-zinc-500">{t("lensCount", { count: yr.count })}</span>
                </div>
              </Fragment>
            ))}
            <div className="absolute inset-y-0 left-2.5 right-2.5">
              {TALL_TICKS.filter((f) => f > fMin && f < fMax).map((f) => (
                <Fragment key={f}>
                  <span className="absolute top-0 w-12 -translate-x-1/2 text-center text-[11px] tabular-nums text-zinc-500" style={{ left: pct(frac(f)) }}>
                    {f}mm
                  </span>
                  <div className="absolute w-px bg-zinc-100" style={{ left: pct(frac(f)), top: TALL.rowLabel - 4, height: tall.height - TALL.rowLabel }} />
                </Fragment>
              ))}
              {tall.rows.flatMap(({ placed }) =>
                placed.map(({ e, top: itemTop }) => (
                  <Fragment key={e.lens.id}>
                    {isChartZoom(e.lens) && (
                      <div
                        aria-hidden="true"
                        className="absolute h-1.5 rounded bg-zinc-900/15"
                        style={{
                          left: pct(frac(e.lens.focalMin)),
                          width: pct(frac(e.lens.focalMax) - frac(e.lens.focalMin)),
                          top: itemTop + TALL.size / 2 - 3,
                          opacity: dimmed(e.lens),
                        }}
                      />
                    )}
                    <Link
                      href={lensPath(e.lens)}
                      aria-label={`${brandLabel(tBrand, e.lens.brand)} ${e.lens.model}`}
                      {...itemHandlers(e.lens.id)}
                      className={cn("absolute block", active === e.lens.id ? "z-20" : "z-10")}
                      style={{
                        left: pct(frac(e.focalMid)),
                        marginLeft: -TALL.size / 2,
                        top: itemTop,
                        width: TALL.size,
                        height: TALL.size,
                        opacity: dimmed(e.lens),
                      }}
                    >
                      <Image src={getLensImageUrl(e.lens.id)} alt="" width={TALL.size} height={TALL.size} className="size-full object-contain drop-shadow-sm" />
                    </Link>
                  </Fragment>
                )),
              )}
            </div>
            {activeEntry && activeTall && (
              <ChartLensCard
                lens={activeEntry.lens}
                spec={spec(activeEntry)}
                className="absolute inset-x-0 z-30 w-auto"
                style={{ top: activeTall.top + TALL.size + 6 }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
