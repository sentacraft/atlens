import type { FunnelStep } from "@/lib/analytics/dashboard";

// Events before this moved from Analytics Engine, whose 30-minute session id stands in for the visitor.
export const D1_CUTOVER_DAY = "2026-10-19";

export const AVERAGE_DAYS = 7;
const SPARK = "#2a78d6";
const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";
export const COUNT_WIDTH = "w-20";

type Row = Record<string, unknown>;

export function fmtNum(value: number): string {
  return value.toLocaleString("en-US");
}

export function fmtCompact(value: number): string {
  return value >= 10_000 ? `${(value / 1000).toFixed(1)}K` : fmtNum(Math.round(value));
}

export function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <h2 className="font-heading text-base font-semibold text-zinc-800">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  titleKey?: string;
  widthClass?: string;
}

export function Table({ rows, columns }: { rows: Row[]; columns: Column[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">No data in this range.</p>;
  }
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-zinc-400">
          {columns.map((c) => (
            <th key={c.key} className={`pb-2 font-medium ${c.align === "right" ? "text-right" : "text-left"} ${c.widthClass ?? ""}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-zinc-100">
            {columns.map((c) => (
              <td
                key={c.key}
                title={c.titleKey ? String(r[c.titleKey] ?? "") : undefined}
                className={`py-1.5 ${c.align === "right" ? "text-right tabular-nums" : "truncate text-left"}`}
              >
                {typeof r[c.key] === "number" ? fmtNum(r[c.key] as number) : String(r[c.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Facts({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-500">{label}</dt>
          <dd className="text-right tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
      <path d={path} fill="none" stroke={SPARK} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ change, upIsGood, periodLabel }: { change: number | null; upIsGood: boolean; periodLabel: string }) {
  if (change === null) {
    return <span className="text-xs text-zinc-400">Not enough earlier data to compare</span>;
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

export function StatTile({
  label,
  value,
  change,
  upIsGood = true,
  periodLabel,
  spark,
}: {
  label: string;
  value: string;
  change: number | null;
  upIsGood?: boolean;
  periodLabel: string;
  spark: Array<number | null>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="font-heading text-3xl font-semibold text-zinc-900">{value}</span>
      <Delta change={change} upIsGood={upIsGood} periodLabel={periodLabel} />
      <Sparkline values={spark} />
    </div>
  );
}

const FUNNEL_LABELS: Record<FunnelStep["key"], string> = {
  sessions: "All sessions",
  explored: "Searched or filtered",
  viewed: "Viewed a lens",
  compared: "Opened a comparison",
  toStore: "Clicked through to a store",
};

export function Funnel({ steps, previous }: { steps: FunnelStep[]; previous: FunnelStep[] | null }) {
  const total = steps[0]?.sessions ?? 0;
  const previousTotal = previous?.[0]?.sessions ?? 0;
  return (
    <ul className="space-y-3">
      {steps.map((step, i) => {
        const share = ratio(step.sessions, total);
        const previousShare = previous ? ratio(previous[i].sessions, previousTotal) : null;
        return (
          <li key={step.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-zinc-700">{FUNNEL_LABELS[step.key]}</span>
              <span className="shrink-0 tabular-nums text-zinc-900">
                {fmtNum(step.sessions)} <span className="text-zinc-500">· {pct(step.sessions, total)}</span>
              </span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-zinc-100">
              <div className="h-3 rounded-full" style={{ width: `${(share ?? 0) * 100}%`, background: SPARK }} />
            </div>
            {i > 0 && previousShare !== null && (
              <p className="mt-0.5 text-xs text-zinc-400">Previous period {Math.round(previousShare * 100)}%</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
