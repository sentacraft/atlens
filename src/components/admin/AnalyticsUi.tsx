import { eventDefinitions, type Definition, type EVENT_DOCS } from "@/lib/analytics/events";

// Events before this moved from Analytics Engine, whose 30-minute session id stands in for the visitor.
export const D1_CUTOVER_DAY = "2026-10-19";

export const AVERAGE_DAYS = 7;
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

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  titleKey?: string;
  widthClass?: string;
}

export function Table({ rows, columns }: { rows: Row[]; columns: Column[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No data in this range.</p>;
  }
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-zinc-500">
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

/** Terms and what they mean, for a card's info panel. */
export function Definitions({ items }: { items: Definition[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
      {items.map((item) => (
        <div key={item.term} className="contents">
          <dt className="font-medium text-zinc-900">{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

/** An event's documented meaning, and its listed fields' values, from the event docs. */
export function EventDefinitions({
  event,
  fields = [],
  title,
}: {
  event: keyof typeof EVENT_DOCS;
  fields?: string[];
  title?: string;
}) {
  const docs = eventDefinitions(event, fields);
  return (
    <div className="space-y-2">
      {title && <p className="font-semibold text-zinc-900">{title}</p>}
      <p>{docs.description}</p>
      {docs.fields.map((field) => (
        <div key={field.description} className="space-y-1">
          <p className="text-zinc-600">{field.description}</p>
          {field.values.length > 0 && <Definitions items={field.values} />}
        </div>
      ))}
    </div>
  );
}
