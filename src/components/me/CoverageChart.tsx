"use client";

import { useTranslations } from "next-intl";
import {
  axisPosition,
  coverageAxis,
  coverageRows,
  wideGap,
  type CoverageInput,
} from "@/lib/me/coverage";
import { cn } from "@/lib/utils";

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

// The ticks a phone-width axis keeps, besides both ends.
const MOBILE_TICKS = new Set([24, 50, 135]);

export default function CoverageChart({ lenses }: { lenses: CoverageInput[] }) {
  const t = useTranslations("Profile");
  const rows = coverageRows(lenses);
  const axis = coverageAxis(rows);
  const gap = wideGap(rows, axis);
  const hasManual = rows.some((row) => row.manual);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 px-4 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-900">{t("coverageTitle")}</span>
        <span className="text-xs text-zinc-500">{t("coverageAxis")}</span>
      </div>

      <div className="md:grid md:grid-cols-[128px_1fr] md:gap-x-3">
        <div className="hidden md:flex md:flex-col">
          {rows.map((row) => (
            <span key={row.id} className="h-7 truncate text-right text-xs leading-7 text-zinc-600">
              {row.label}
            </span>
          ))}
        </div>
        <div className="relative">
          {gap !== undefined && (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-md bg-[repeating-linear-gradient(135deg,var(--color-amber-400)_0_1px,transparent_1px_7px)] opacity-35"
              style={{ width: percent(axisPosition(gap, axis)) }}
            />
          )}
          {rows.map((row) => {
            const start = axisPosition(row.equivalentMin, axis);
            const end = axisPosition(row.equivalentMax, axis);
            const isPrime = row.equivalentMin === row.equivalentMax;
            return (
              <div key={row.id} className="relative flex flex-col justify-center md:h-7">
                <span className="truncate text-[11px] text-zinc-600 md:hidden" style={{ paddingLeft: percent(Math.min(start, 0.6)) }}>
                  {row.label}
                </span>
                <div className="relative h-3">
                  <div
                    title={`${row.label} · ${row.equivalentMin}${isPrime ? "" : `–${row.equivalentMax}`}mm`}
                    className={cn(
                      "absolute top-0 h-3 rounded-full",
                      row.manual
                        ? "border-2 border-zinc-900 bg-white"
                        : "bg-zinc-900",
                    )}
                    style={
                      isPrime
                        ? { left: `calc(${percent(start)} - 6px)`, width: 12 }
                        : { left: percent(start), width: `max(12px, ${percent(end - start)})` }
                    }
                  />
                </div>
              </div>
            );
          })}
          <div className="relative mt-2 h-5 border-t border-zinc-200">
            {axis.ticks.map((tick, index) => (
              <span
                key={tick}
                className={cn(
                  "absolute top-1.5 text-[10px] text-zinc-500 md:text-[11px]",
                  index === 0 ? "" : index === axis.ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
                  index > 0 && index < axis.ticks.length - 1 && !MOBILE_TICKS.has(tick) && "hidden md:block",
                )}
                style={{ left: percent(axisPosition(tick, axis)) }}
              >
                {index === axis.ticks.length - 1 ? `${tick}mm` : tick}
              </span>
            ))}
          </div>
        </div>
      </div>

      {(gap !== undefined || hasManual) && (
        <p className="text-xs text-zinc-500">
          {t("coverageNote", { gap: gap === undefined ? "none" : String(gap), manual: hasManual ? "yes" : "no" })}
        </p>
      )}
    </div>
  );
}
