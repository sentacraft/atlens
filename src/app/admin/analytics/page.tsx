import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import TrendChart from "@/components/admin/TrendChart";
import {
  DAY_MS,
  countBy,
  loadAccounts,
  loadFirstEventTs,
  loadDaily,
  loadFunnel,
  loadIris,
  loadIrisFeedback,
  loadOverview,
  loadSignedInShare,
  rangeWindows,
  type FunnelStep,
  type Overview,
} from "@/lib/analytics/dashboard";
import {
  aggregateFilterDimensions,
  formatFilterSnapshot,
  formatHref,
  formatLensSlug,
  formatLensSlugList,
  formatShareMethod,
} from "@/lib/analytics/format";
import { movingAverage, percentChange } from "@/lib/analytics/series";
import {
  ANALYTICS_RANGES,
  adminAnalyticsPath,
  resolveAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All time",
};

// Events before this moved from Analytics Engine, whose 30-minute session id stands in for the visitor.
const D1_CUTOVER_DAY = "2026-10-19";

const AVERAGE_DAYS = 7;
const SPARK = "#2a78d6";
const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";
const COUNT_WIDTH = "w-20";

type Row = Record<string, unknown>;

function fmtNum(value: number): string {
  return value.toLocaleString("en-US");
}

function fmtCompact(value: number): string {
  return value >= 10_000 ? `${(value / 1000).toFixed(1)}K` : fmtNum(Math.round(value));
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
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

function Table({ rows, columns }: { rows: Row[]; columns: Column[] }) {
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

function Facts({ items }: { items: Array<[string, string]> }) {
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

function StatTile({
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

function Funnel({ steps, previous }: { steps: FunnelStep[]; previous: FunnelStep[] | null }) {
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

export default async function AnalyticsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  // A dynamic server component renders once per request, so the purity rule's re-render concern does not apply.
  // eslint-disable-next-line react-hooks/purity
  const windows = rangeWindows(range, Date.now());
  const { current } = windows;
  const { env } = getCloudflareContext();
  const events = env.ANALYTICS_DB;
  // A previous period that starts before the first event would compare against a partial period.
  const firstEventTs = await loadFirstEventTs(events);
  const previous = windows.previous && firstEventTs !== null && windows.previous.from >= firstEventTs ? windows.previous : null;

  const [
    overview,
    previousOverview,
    paddedDaily,
    funnel,
    previousFunnel,
    iris,
    irisFeedback,
    accounts,
    signedIn,
    searchZero,
    searchTop,
    lensViews,
    referrers,
    compareCombos,
    filterSnapshots,
    filterAll,
    purchaseByChannel,
    purchaseByLens,
    outbound,
    outboundBySource,
    share,
    shareBySource,
    feedbackOpens,
    feedbackSubmits,
    pwaLaunches,
    installs,
    mountSwitches,
    locales,
  ] = await Promise.all([
    loadOverview(events, current),
    previous ? loadOverview(events, previous) : null,
    // The days before the range warm up the trailing average, so it starts on the range's first day.
    loadDaily(events, { from: Math.max(0, current.from - (AVERAGE_DAYS - 1) * DAY_MS), to: current.to }),
    loadFunnel(events, current),
    previous ? loadFunnel(events, previous) : null,
    loadIris(events, current),
    loadIrisFeedback(env.ASKIRIS_DB, current),
    loadAccounts(env.APP_DB, current),
    loadSignedInShare(events, current),
    countBy(events, current, "search", ["query"], { where: { results_count: 0 } }),
    countBy(events, current, "search", ["query"]),
    countBy(events, current, "lens_view", ["lens_slug"]),
    countBy(events, current, "lens_view", ["referrer"], { limit: 15 }),
    countBy(events, current, "compare_view", ["lens_slugs"]),
    countBy(events, current, "filter_apply", ["filters_json"], { limit: 10 }),
    countBy(events, current, "filter_apply", ["filters_json"], { limit: 1000 }),
    countBy(events, current, "purchase_click", ["channel", "is_affiliate"], { limit: 100 }),
    countBy(events, current, "purchase_click", ["lens_id"]),
    countBy(events, current, "outbound_click", ["href"]),
    countBy(events, current, "outbound_click", ["path", "href"], { limit: 30 }),
    countBy(events, current, "share_action", ["method"]),
    countBy(events, current, "share_action", ["path", "method"], { limit: 30 }),
    countBy(events, current, "feedback_open", ["feedback_type"]),
    countBy(events, current, "feedback_submit", ["feedback_type"]),
    countBy(events, current, "pwa_launch", ["source"]),
    countBy(events, current, "install_action", []),
    countBy(events, current, "mount_switch", ["from_mount", "to_mount"]),
    countBy(events, current, null, ["locale"]),
  ]);

  const smooth = range !== "7d";
  const warmup = current.from > 0 ? AVERAGE_DAYS - 1 : 0;
  const daily = paddedDaily.slice(warmup);
  const series = (pick: (d: (typeof paddedDaily)[number]) => number) => {
    const values = paddedDaily.map(pick);
    return (smooth ? movingAverage(values, AVERAGE_DAYS) : values).slice(warmup);
  };
  const periodLabel = RANGE_LABELS[range].toLowerCase();
  const change = (pick: (o: Overview) => number) => percentChange(pick(overview), previousOverview ? pick(previousOverview) : null);
  const zeroRate = (o: Overview) => (o.searches > 0 ? o.zeroResultSearches / o.searches : 0);
  const zeroRateChange =
    previousOverview && previousOverview.searches > 0 ? percentChange(zeroRate(overview), zeroRate(previousOverview)) : null;

  const sessionAverages = series((d) => d.sessions);
  const trendPoints = daily.map((d, i) => ({
    day: d.day,
    value: d.sessions,
    average: smooth ? sessionAverages[i] : undefined,
  }));

  const channels = new Map<string, { channel: string; clicks: number; affiliate: number }>();
  for (const row of purchaseByChannel) {
    const channel = String(row.channel ?? "");
    const entry = channels.get(channel) ?? { channel, clicks: 0, affiliate: 0 };
    entry.clicks += row.n;
    if (row.is_affiliate) {
      entry.affiliate += row.n;
    }
    channels.set(channel, entry);
  }
  const feedbackTypes = new Map<string, { feedback_type: string; opens: number; submits: number }>();
  for (const [rowsOf, field] of [
    [feedbackOpens, "opens"],
    [feedbackSubmits, "submits"],
  ] as const) {
    for (const row of rowsOf) {
      const type = String(row.feedback_type ?? "");
      const entry = feedbackTypes.get(type) ?? { feedback_type: type, opens: 0, submits: 0 };
      entry[field] += row.n;
      feedbackTypes.set(type, entry);
    }
  }
  const ratings = irisFeedback.helpful + irisFeedback.unhelpful;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-zinc-900">Analytics</h1>
        <nav aria-label="Time range" className="mt-4 flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((option) => (
            <Link
              key={option}
              href={adminAnalyticsPath(option)}
              aria-current={option === range ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                option === range
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {RANGE_LABELS[option]}
            </Link>
          ))}
        </nav>
        <p className="mt-3 text-sm text-zinc-500">
          Days in China time (UTC+8); internal traffic excluded. Before {D1_CUTOVER_DAY}, each 30-minute
          session counted as its own visitor, so visitor counts from that period run high.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Visitors" value={fmtCompact(overview.visitors)} change={change((o) => o.visitors)} periodLabel={periodLabel} spark={series((d) => d.visitors)} />
        <StatTile label="Sessions" value={fmtCompact(overview.sessions)} change={change((o) => o.sessions)} periodLabel={periodLabel} spark={series((d) => d.sessions)} />
        <StatTile label="Lens views" value={fmtCompact(overview.lensViews)} change={change((o) => o.lensViews)} periodLabel={periodLabel} spark={series((d) => d.lensViews)} />
        <StatTile label="Store clicks" value={fmtCompact(overview.purchaseClicks)} change={change((o) => o.purchaseClicks)} periodLabel={periodLabel} spark={series((d) => d.purchaseClicks)} />
        <StatTile label="Iris turns" value={fmtCompact(overview.irisTurns)} change={change((o) => o.irisTurns)} periodLabel={periodLabel} spark={series((d) => d.irisTurns)} />
        <StatTile
          label="Zero-result searches"
          value={pct(overview.zeroResultSearches, overview.searches)}
          change={zeroRateChange}
          upIsGood={false}
          periodLabel={periodLabel}
          spark={series((d) => d.zeroResultSearches)}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Sessions per day" className="lg:col-span-2">
          {trendPoints.length > 0 ? (
            <TrendChart points={trendPoints} valueLabel="Sessions" averageLabel={smooth ? `${AVERAGE_DAYS}-day average` : undefined} />
          ) : (
            <p className="text-sm text-zinc-400">No data in this range.</p>
          )}
        </Card>
        <Card title="Funnel · sessions that reached each step">
          <Funnel steps={funnel} previous={previousFunnel} />
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-bold text-zinc-900">Ask Iris</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Use">
            <Facts
              items={[
                ["Turns", fmtNum(iris.turns)],
                ["Conversations", fmtNum(iris.conversations)],
                ["Turns per conversation", iris.conversations > 0 ? (iris.turns / iris.conversations).toFixed(1) : "—"],
                ["Visitors who opened Iris", fmtNum(iris.viewers)],
                ["Visitors who asked", fmtNum(iris.askers)],
                ["Recommendation clicks", fmtNum(iris.recClicks)],
              ]}
            />
          </Card>
          <Card title="Reply ratings">
            <Facts
              items={[
                ["Helpful", fmtNum(irisFeedback.helpful)],
                ["Not helpful", fmtNum(irisFeedback.unhelpful)],
                ["Helpful share", pct(irisFeedback.helpful, ratings)],
                ["Rated turns", pct(ratings, iris.turns)],
              ]}
            />
          </Card>
          <Card title="Cost and limits">
            <Facts
              items={[
                ["Tokens", fmtNum(iris.totalTokens)],
                ["Tokens per turn", iris.turns > 0 ? fmtNum(Math.round(iris.totalTokens / iris.turns)) : "—"],
                ["Steps per turn", iris.turns > 0 ? (iris.steps / iris.turns).toFixed(1) : "—"],
                ["Cache-hit rate (input)", pct(iris.cacheReadTokens, iris.inputTokens)],
                ["Step-budget hits", pct(iris.budgetHits, iris.turns)],
                ["Context p50 / p75 / max", [iris.contextP50, iris.contextP75, iris.contextMax].map((v) => (v === null ? "—" : fmtNum(v))).join(" / ")],
              ]}
            />
          </Card>
          <Card title="Steps per turn">
            <Table rows={iris.stepsHistogram} columns={[{ key: "steps", label: "Steps" }, { key: "turns", label: "Turns", align: "right", widthClass: COUNT_WIDTH }]} />
          </Card>
          <Card title="By mount">
            <Table
              rows={iris.byMount}
              columns={[
                { key: "mount", label: "Mount" },
                { key: "turns", label: "Turns", align: "right", widthClass: COUNT_WIDTH },
                { key: "tokens", label: "Tokens", align: "right", widthClass: "w-24" },
              ]}
            />
          </Card>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-bold text-zinc-900">Accounts</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Sign-ups and saves">
            <Facts
              items={[
                ["New accounts", fmtNum(accounts.newAccounts)],
                ["Accounts in total", fmtNum(accounts.totalAccounts)],
                ["Favorites added", fmtNum(accounts.favoritesAdded)],
                ["Gear added", fmtNum(accounts.gearAdded)],
              ]}
            />
          </Card>
          <Card title={`Signed-in sessions (since ${D1_CUTOVER_DAY})`}>
            <Facts
              items={[
                ["Sessions", fmtNum(signedIn.sessions)],
                ["With an account signed in", fmtNum(signedIn.signedIn)],
                ["Share", pct(signedIn.signedIn, signedIn.sessions)],
              ]}
            />
          </Card>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-bold text-zinc-900">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Search · zero-result queries">
            <Table rows={searchZero} columns={[{ key: "query", label: "Query" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]} />
          </Card>
          <Card title="Search · top queries">
            <Table rows={searchTop} columns={[{ key: "query", label: "Query" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]} />
          </Card>
          <Card title="Lens pages · most viewed">
            <Table
              rows={lensViews.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_slug ?? "")) }))}
              columns={[{ key: "display", label: "Lens", titleKey: "lens_slug" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Lens pages · referrers">
            <Table
              rows={referrers.filter((r) => r.referrer).map((r) => ({ ...r, display: formatHref(String(r.referrer)) }))}
              columns={[{ key: "display", label: "Referrer", titleKey: "referrer" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Compare · lens combinations">
            <Table
              rows={compareCombos.map((r) => ({ ...r, display: formatLensSlugList(String(r.lens_slugs ?? "")) }))}
              columns={[{ key: "display", label: "Lenses", titleKey: "lens_slugs" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Filters · per dimension">
            <Table
              rows={aggregateFilterDimensions(filterAll.map((r) => ({ filters: r.filters_json, n: r.n })))}
              columns={[{ key: "dimension", label: "Filter" }, { key: "n", label: "Applies", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Filters · most-used combinations">
            <Table
              rows={filterSnapshots.map((r) => ({ ...r, display: formatFilterSnapshot(String(r.filters_json ?? "")) }))}
              columns={[{ key: "display", label: "Filters", titleKey: "filters_json" }, { key: "n", label: "Applies", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Store clicks · by channel">
            <Table
              rows={[...channels.values()].sort((a, b) => b.clicks - a.clicks)}
              columns={[
                { key: "channel", label: "Channel" },
                { key: "clicks", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
                { key: "affiliate", label: "Affiliate", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>
          <Card title="Store clicks · top lenses">
            <Table
              rows={purchaseByLens.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_id ?? "")) }))}
              columns={[{ key: "display", label: "Lens", titleKey: "lens_id" }, { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Outbound · destinations">
            <Table
              rows={outbound.map((r) => ({ ...r, display: formatHref(String(r.href ?? "")) }))}
              columns={[{ key: "display", label: "Destination", titleKey: "href" }, { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Outbound · by source page">
            <Table
              rows={outboundBySource.map((r) => ({ ...r, display: formatHref(String(r.href ?? "")) }))}
              columns={[
                { key: "path", label: "Source page" },
                { key: "display", label: "Destination", titleKey: "href" },
                { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>
          <Card title="Share · by method">
            <Table
              rows={share.map((r) => ({ ...r, display: formatShareMethod(String(r.method ?? "")) }))}
              columns={[{ key: "display", label: "Method", titleKey: "method" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]}
            />
          </Card>
          <Card title="Share · by source page">
            <Table
              rows={shareBySource.map((r) => ({ ...r, display: formatShareMethod(String(r.method ?? "")) }))}
              columns={[
                { key: "path", label: "Source page" },
                { key: "display", label: "Method", titleKey: "method" },
                { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>
          <Card title="Feedback · opens and submits">
            <Table
              rows={[...feedbackTypes.values()]}
              columns={[
                { key: "feedback_type", label: "Type" },
                { key: "opens", label: "Opens", align: "right", widthClass: COUNT_WIDTH },
                { key: "submits", label: "Submits", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>
          <Card title="App · launches and installs">
            <Facts items={[["Accepted install prompts", fmtNum(installs[0]?.n ?? 0)]]} />
            <div className="mt-3">
              <Table rows={pwaLaunches} columns={[{ key: "source", label: "Launched from" }, { key: "n", label: "Launches", align: "right", widthClass: COUNT_WIDTH }]} />
            </div>
          </Card>
          <Card title="Mount switches">
            <Table
              rows={mountSwitches}
              columns={[
                { key: "from_mount", label: "From" },
                { key: "to_mount", label: "To" },
                { key: "n", label: "Switches", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>
          <Card title="Language">
            <Table rows={locales} columns={[{ key: "locale", label: "Locale" }, { key: "n", label: "Events", align: "right", widthClass: COUNT_WIDTH }]} />
          </Card>
        </div>
      </section>
    </main>
  );
}
