"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { CRITICAL, GOOD, SERIES } from "@/components/admin/chart-colors";
import { ICON_NAV_BTN_CLS } from "@/config/ui-tokens";

function Sparkline({ values }: { values: Array<number | null> }) {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) {
    return null;
  }
  const max = Math.max(...present) || 1;
  const step = 100 / (values.length - 1);
  const path = values
    .map((v, i) => (v === null ? null : `${i * step},${28 - (v / max) * 26}`))
    .reduce<string[]>((parts, point, i, all) => {
      if (point) {
        parts.push(`${i > 0 && all[i - 1] ? "L" : "M"}${point}`);
      }
      return parts;
    }, [])
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden>
      <path d={path} fill="none" stroke={SERIES} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ change, upIsGood, periodLabel }: { change: number | null; upIsGood: boolean; periodLabel: string }) {
  if (change === null) {
    return <span className="text-xs text-zinc-500">Not enough earlier data to compare</span>;
  }
  const up = change > 0;
  const flat = Math.abs(change) < 0.005;
  const good = up === upIsGood;
  return (
    <span className="text-xs text-zinc-500">
      <span style={{ color: flat ? undefined : good ? GOOD : CRITICAL }} aria-hidden>
        {flat ? "→" : up ? "▲" : "▼"}
      </span>{" "}
      <span className="tabular-nums">{`${up ? "+" : ""}${Math.round(change * 100)}%`}</span> vs previous {periodLabel}
    </span>
  );
}

/** A headline number with its change and daily trend; the info button says what it counts. */
export default function StatTile({
  label,
  value,
  definition,
  change,
  upIsGood = true,
  periodLabel,
  spark,
}: {
  label: string;
  value: string;
  definition: string;
  change: number | null;
  upIsGood?: boolean;
  periodLabel: string;
  spark: Array<number | null>;
}) {
  const [showDefinition, setShowDefinition] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={() => setShowDefinition((shown) => !shown)}
          aria-expanded={showDefinition}
          aria-label={`What ${label} counts`}
          className={`${ICON_NAV_BTN_CLS} -mr-2 -mt-1.5 size-8 ${showDefinition ? "bg-zinc-100 text-zinc-900" : ""}`}
        >
          <Info size={14} aria-hidden />
        </button>
      </div>
      {showDefinition && <p className="text-xs leading-relaxed text-zinc-600">{definition}</p>}
      <span className="font-heading text-3xl font-semibold text-zinc-900">{value}</span>
      <Delta change={change} upIsGood={upIsGood} periodLabel={periodLabel} />
      <Sparkline values={spark} />
    </div>
  );
}
