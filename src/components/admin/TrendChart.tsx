"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const SERIES = "#2a78d6";
const GRID = "#e4e4e7";
const HEIGHT = 200;
const MARGIN = { top: 8, right: 8, bottom: 22, left: 40 };
const MAX_BAR = 24;
const MIN_LABEL_GAP = 44;

export interface TrendPoint {
  day: string;
  value: number;
  /** Trailing average; null while the window warms up, undefined when the chart shows none. */
  average?: number | null;
}

function compact(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/** Daily bars with an optional trailing-average line, a crosshair tooltip and a table view. */
export default function TrendChart({
  points,
  valueLabel,
  averageLabel,
}: {
  points: TrendPoint[];
  valueLabel: string;
  averageLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hasAverage = points.some((p) => p.average !== undefined);
  const maxValue = niceMax(Math.max(0, ...points.map((p) => Math.max(p.value, p.average ?? 0))));
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = points.length > 0 ? plotWidth / points.length : 0;
  const barWidth = Math.max(1, Math.min(MAX_BAR, band - 2));
  const x = (i: number) => MARGIN.left + band * (i + 0.5);
  const y = (value: number) => MARGIN.top + plotHeight * (1 - value / maxValue);
  const ticks = [0, maxValue / 2, maxValue];
  const labelEvery = Math.max(1, Math.ceil(points.length / 6), Math.ceil(MIN_LABEL_GAP / Math.max(band, 1)));

  const linePath = points
    .map((p, i) => (p.average == null ? null : `${x(i)},${y(p.average)}`))
    .reduce<string[]>((segments, point, i, all) => {
      if (point) {
        segments.push(`${i > 0 && all[i - 1] ? "L" : "M"}${point}`);
      }
      return segments;
    }, [])
    .join(" ");

  function indexAt(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const i = Math.floor((event.clientX - rect.left - MARGIN.left) / band);
    return i >= 0 && i < points.length ? i : null;
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -1 : 1;
    setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? points.length - 1) + step)));
  }

  const activePoint = active === null ? null : points[active];

  return (
    <div>
      {hasAverage && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES, opacity: 0.3 }} />
            {valueLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: SERIES }} />
            {averageLabel}
          </span>
        </div>
      )}
      <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${valueLabel} by day`}
            tabIndex={0}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onPointerMove={(event) => setActive(indexAt(event))}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
                <text x={MARGIN.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-zinc-500 text-[11px] tabular-nums">
                  {compact(tick)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const top = y(p.value);
              const height = MARGIN.top + plotHeight - top;
              const radius = Math.min(4, barWidth / 2, height);
              const left = x(i) - barWidth / 2;
              const bottom = MARGIN.top + plotHeight;
              return height > 0 ? (
                <path
                  key={p.day}
                  d={`M${left},${bottom} V${top + radius} Q${left},${top} ${left + radius},${top} H${left + barWidth - radius} Q${left + barWidth},${top} ${left + barWidth},${top + radius} V${bottom} Z`}
                  fill={SERIES}
                  opacity={active === i ? 0.5 : hasAverage ? 0.3 : 0.8}
                />
              ) : null;
            })}
            {linePath && (
              <path d={linePath} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {points.map((p, i) => {
              const last = points.length - 1;
              // The last day always gets a label, so a regular label too close to it gives way.
              const labelled = i === last || (i % labelEvery === 0 && (last - i) * band >= MIN_LABEL_GAP);
              const anchor = i === last ? "end" : "middle";
              const labelX = i === last ? x(i) + band / 2 : x(i);
              return labelled ? (
                <text key={p.day} x={labelX} y={HEIGHT - 6} textAnchor={anchor} className="fill-zinc-500 text-[11px] tabular-nums">
                  {p.day.slice(5)}
                </text>
              ) : null;
            })}
            {activePoint && active !== null && (
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} stroke="#a1a1aa" strokeWidth={1} />
            )}
          </svg>
        )}
        {activePoint && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(0, x(active) - 70), Math.max(0, width - 140)),
            }}
          >
            <div className="text-zinc-500">{activePoint.day}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES, opacity: 0.3 }} />
              <span className="font-semibold text-zinc-900 tabular-nums">{compact(activePoint.value)}</span>
              <span className="text-zinc-500">{valueLabel}</span>
            </div>
            {hasAverage && (
              <div className="mt-0.5 flex items-center gap-2">
                <span className="h-0.5 w-2.5 rounded-full" style={{ background: SERIES }} />
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {activePoint.average == null ? "—" : compact(activePoint.average)}
                </span>
                <span className="text-zinc-500">{averageLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-zinc-500">
        <summary className="cursor-pointer select-none">Table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="text-zinc-400">
              <th className="font-medium">Day</th>
              <th className="text-right font-medium">{valueLabel}</th>
              {hasAverage && <th className="text-right font-medium">{averageLabel}</th>}
            </tr>
          </thead>
          <tbody className="text-zinc-700">
            {points.map((p) => (
              <tr key={p.day} className="border-t border-zinc-100">
                <td>{p.day}</td>
                <td className="text-right">{p.value}</td>
                {hasAverage && <td className="text-right">{p.average == null ? "—" : p.average.toFixed(1)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
