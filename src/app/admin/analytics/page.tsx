// Analytics dashboard. Reads from the `xglass_events` Analytics Engine
// dataset via the SQL API. All queries cover the last 30 days unless
// stated otherwise.
//
// Access control: Cloudflare Access in production (see PR description).
// The route itself is open — auth lives one layer above at the platform.

import { queryAE } from "@/lib/analytics/query";
import { ASKIRIS_TURN_EVENT } from "@/lib/analytics/events";
import {
  aggregateFilterDimensions,
  formatFilterSnapshot,
  formatHref,
  formatLensSlug,
  formatLensSlugList,
  formatShareMethod,
} from "@/lib/analytics/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW = "INTERVAL '30' DAY";
const DASHBOARD_FILTER = `timestamp > NOW() - ${WINDOW} AND blob7 != '1'`;

// AE SQL only accepts a bare column inside `count(DISTINCT …)`, not an
// expression like `IF(cond, col, NULL)`. To get per-event-type distinct
// counts, split the work across two queries: one for global totals,
// one with `GROUP BY index1` so each event class becomes its own row.
const Q_OVERVIEW_TOTALS = `
  SELECT
    SUM(_sample_interval) AS events,
    count(DISTINCT blob1) AS sessions
  FROM xglass_events
  WHERE ${DASHBOARD_FILTER}
`;

const Q_OVERVIEW_UNIQUES = `
  SELECT
    index1 AS event,
    count(DISTINCT blob4) AS uniques
  FROM xglass_events
  WHERE index1 IN ('search', 'lens_view')
    AND ${DASHBOARD_FILTER}
  GROUP BY event
`;

const Q_LOCALE_SPLIT = `
  SELECT
    blob2 AS locale,
    SUM(_sample_interval) AS events,
    count(DISTINCT blob1) AS sessions
  FROM xglass_events
  WHERE ${DASHBOARD_FILTER} AND blob2 != ''
  GROUP BY locale
  ORDER BY events DESC
`;

const Q_REFERRER = `
  SELECT blob5 AS referrer, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'lens_view' AND blob5 != ''
    AND ${DASHBOARD_FILTER}
  GROUP BY referrer
  ORDER BY n DESC
  LIMIT 15
`;

const Q_SEARCH_ZERO = `
  SELECT blob4 AS query, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'search' AND double1 = 0
    AND ${DASHBOARD_FILTER}
  GROUP BY query
  ORDER BY n DESC
  LIMIT 20
`;

const Q_SEARCH_ALL = `
  SELECT blob4 AS query, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'search'
    AND ${DASHBOARD_FILTER}
  GROUP BY query
  ORDER BY n DESC
  LIMIT 20
`;

const Q_FILTER_USAGE = `
  SELECT blob4 AS filters, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'filter_apply'
    AND ${DASHBOARD_FILTER}
  GROUP BY filters
  ORDER BY n DESC
  LIMIT 10
`;

// Same source as Q_FILTER_USAGE but pulls a deep slice of distinct combos so
// the server can decompose them into per-dimension counts (see
// aggregateFilterDimensions). The limit is a safety cap; real distinct-combo
// cardinality is far below it.
const Q_FILTER_DIMENSIONS = `
  SELECT blob4 AS filters, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'filter_apply'
    AND ${DASHBOARD_FILTER}
  GROUP BY filters
  ORDER BY n DESC
  LIMIT 1000
`;

// Same constraint as the overview uniques: instead of conditional
// distinct counts in a flat row, fan out by index1 and reassemble the
// funnel rows in JS.
const Q_COMPARE_FUNNEL = `
  SELECT
    index1 AS step,
    SUM(_sample_interval) AS n,
    count(DISTINCT blob1) AS sids
  FROM xglass_events
  WHERE index1 IN ('compare_add', 'compare_view', 'compare_scroll')
    AND ${DASHBOARD_FILTER}
  GROUP BY step
`;

const Q_COMPARE_COMBOS = `
  SELECT blob5 AS slugs, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'compare_view' AND blob5 != ''
    AND ${DASHBOARD_FILTER}
  GROUP BY slugs
  ORDER BY n DESC
  LIMIT 20
`;

const Q_LENS_VIEW_TOP = `
  SELECT blob4 AS lens_slug, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'lens_view'
    AND ${DASHBOARD_FILTER}
  GROUP BY lens_slug
  ORDER BY n DESC
  LIMIT 20
`;

const Q_FEEDBACK = `
  SELECT
    blob4 AS feedback_type,
    sumIf(_sample_interval, index1 = 'feedback_open') AS opens,
    sumIf(_sample_interval, index1 = 'feedback_submit') AS submits
  FROM xglass_events
  WHERE index1 IN ('feedback_open', 'feedback_submit')
    AND ${DASHBOARD_FILTER}
  GROUP BY feedback_type
`;

const Q_SHARE = `
  SELECT blob5 AS method, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'share_action'
    AND ${DASHBOARD_FILTER}
  GROUP BY method
  ORDER BY n DESC
`;

const Q_INSTALL = `
  SELECT SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'install_action'
    AND ${DASHBOARD_FILTER}
`;

const Q_MOUNT_SWITCH = `
  SELECT
    blob5 AS from_mount,
    blob4 AS to_mount,
    SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'mount_switch'
    AND ${DASHBOARD_FILTER}
  GROUP BY from_mount, to_mount
  ORDER BY n DESC
`;

const Q_OUTBOUND = `
  SELECT blob4 AS href, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'outbound_click'
    AND ${DASHBOARD_FILTER}
  GROUP BY href
  ORDER BY n DESC
  LIMIT 20
`;

const Q_OUTBOUND_BY_SOURCE = `
  SELECT
    blob3 AS source_path,
    blob4 AS href,
    SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'outbound_click'
    AND ${DASHBOARD_FILTER}
  GROUP BY source_path, href
  ORDER BY n DESC
  LIMIT 30
`;

const Q_SHARE_BY_SOURCE = `
  SELECT
    blob3 AS source_path,
    blob5 AS method,
    SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'share_action'
    AND ${DASHBOARD_FILTER}
  GROUP BY source_path, method
  ORDER BY n DESC
  LIMIT 30
`;

const Q_PURCHASE_BY_CHANNEL = `
  SELECT
    blob4 AS channel,
    SUM(_sample_interval) AS clicks,
    sumIf(_sample_interval, double1 = 1) AS affiliate_clicks
  FROM xglass_events
  WHERE index1 = 'purchase_click'
    AND ${DASHBOARD_FILTER}
  GROUP BY channel
  ORDER BY clicks DESC
`;

const Q_PURCHASE_BY_LENS = `
  SELECT blob5 AS lens_id, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'purchase_click'
    AND ${DASHBOARD_FILTER}
  GROUP BY lens_id
  ORDER BY n DESC
  LIMIT 20
`;

// Cold-launch attribution for PWA entry points. `source` distinguishes
// the home-screen icon (pwa) from each manifest shortcut so we can see
// which entry point actually gets used after install.
const Q_PWA_LAUNCH = `
  SELECT blob6 AS source, SUM(_sample_interval) AS launches
  FROM xglass_events
  WHERE index1 = 'pwa_launch'
    AND ${DASHBOARD_FILTER}
  GROUP BY source
  ORDER BY launches DESC
`;

// AskIris — per-turn agent metrics written straight to AE from the chat route's
// onEnd (not via /api/track), so these rows carry their own positional layout:
// blob1=mount, blob2=locale, blob3=sid, blob4=segment_id; double1..6 =
// total/input/output/cacheRead tokens, step_count, budget_hit. Counts weight by
// _sample_interval; summed metrics weight each row's value by it too, to stay correct
// if AE ever samples this dataset. The funnel's page-view entry is a separate
// askiris_view event on the general /api/track layout (blob1=sid).
const ASKIRIS_FILTER = `index1 = '${ASKIRIS_TURN_EVENT}' AND timestamp > NOW() - ${WINDOW}`;
const ASKIRIS_VIEW_FILTER = `index1 = 'askiris_view' AND timestamp > NOW() - ${WINDOW}`;

const Q_ASKIRIS_OVERVIEW = `
  SELECT
    SUM(_sample_interval) AS turns,
    SUM(double1 * _sample_interval) AS total_tokens,
    SUM(double2 * _sample_interval) AS input_tokens,
    SUM(double3 * _sample_interval) AS output_tokens,
    SUM(double4 * _sample_interval) AS cache_read_tokens,
    SUM(double5 * _sample_interval) AS total_steps,
    SUM(double6 * _sample_interval) AS budget_hits
  FROM xglass_events
  WHERE ${ASKIRIS_FILTER}
`;

const Q_ASKIRIS_BY_STEP = `
  SELECT double5 AS steps, SUM(_sample_interval) AS turns
  FROM xglass_events
  WHERE ${ASKIRIS_FILTER}
  GROUP BY steps
  ORDER BY steps
`;

const Q_ASKIRIS_BY_MOUNT = `
  SELECT
    blob1 AS mount,
    SUM(_sample_interval) AS turns,
    SUM(double1 * _sample_interval) AS total_tokens
  FROM xglass_events
  WHERE ${ASKIRIS_FILTER} AND blob1 != ''
  GROUP BY mount
  ORDER BY turns DESC
`;

// Session funnel. Views (PV = loads, UV = distinct visitor sid) come from the
// askiris_view event; the interacted side (visitors who sent a turn, and how those
// turns group into sessions) comes from the turn rows keyed by sid + segment_id. A
// session = one conversation segment (a new one starts on a mount switch / new chat).
const Q_ASKIRIS_VIEWS = `
  SELECT
    SUM(_sample_interval) AS pv,
    count(DISTINCT blob1) AS uv
  FROM xglass_events
  WHERE ${ASKIRIS_VIEW_FILTER}
`;

const Q_ASKIRIS_SESSIONS = `
  SELECT
    count(DISTINCT blob3) AS interacted_uv,
    count(DISTINCT blob4) AS sessions,
    SUM(_sample_interval) AS turns
  FROM xglass_events
  WHERE ${ASKIRIS_FILTER} AND blob4 != ''
`;

function pct(num: number, denom: number): string {
  if (denom <= 0) {
    return "—";
  }
  return `${Math.round((num / denom) * 100)}%`;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

// Renders "—" for absent values so the dashboard can distinguish "AE
// returned no row / null aggregate" from "AE returned a genuine 0".
function fmtMaybe(v: unknown): string {
  if (v === null || v === undefined) {
    return "—";
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return n.toLocaleString("en-US");
}

// DeepSeek V4-Flash list price, CNY per 1M tokens (as of 2026-07 —
// api-docs.deepseek.com/quick_start/pricing). Cache-hit input is billed ~98% off;
// cache-miss input is (input − cacheRead). Update if the model or rates change.
const DEEPSEEK_CNY_PER_1M = { inputMiss: 1, cacheHit: 0.02, output: 2 };

function askirisCostCny(input: number, cacheRead: number, output: number): number {
  const inputMiss = Math.max(0, input - cacheRead);
  return (
    (inputMiss / 1e6) * DEEPSEEK_CNY_PER_1M.inputMiss +
    (cacheRead / 1e6) * DEEPSEEK_CNY_PER_1M.cacheHit +
    (output / 1e6) * DEEPSEEK_CNY_PER_1M.output
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-heading text-base font-semibold text-zinc-800 dark:text-zinc-100">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  // When set, also use the value at this key (the raw / unformatted form)
  // for the cell's `title` tooltip attribute so truncated content remains
  // discoverable on hover.
  titleKey?: string;
  // Constrain a numeric column so a 1-digit count doesn't take half the
  // row width; left undefined for primary string columns to let them fill.
  widthClass?: string;
}

function Table({ rows, columns }: { rows: Array<Record<string, unknown>>; columns: Column[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">No data yet.</p>;
  }
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-zinc-400">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`pb-2 font-medium ${c.align === "right" ? "text-right" : "text-left"} ${c.widthClass ?? ""}`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
            {columns.map((c) => {
              const raw = r[c.key];
              const title = c.titleKey ? String(r[c.titleKey] ?? "") : undefined;
              return (
                <td
                  key={c.key}
                  title={title}
                  className={`py-1.5 ${c.align === "right" ? "text-right tabular-nums" : "truncate text-left"}`}
                >
                  {String(raw ?? "")}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Single-number stat for the top overview bar.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="font-heading text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </span>
    </div>
  );
}

// Narrow width class shared by every "count" / "n" column so the long
// primary string column gets the remaining space.
const COUNT_WIDTH = "w-20";

export default async function AnalyticsDashboardPage() {
  const [
    overviewTotals,
    overviewUniques,
    localeSplit,
    referrers,
    searchZero,
    searchAll,
    filterUsage,
    filterDimensions,
    compareFunnel,
    compareCombos,
    lensViews,
    feedback,
    share,
    shareBySource,
    install,
    mountSwitch,
    outbound,
    outboundBySource,
    purchaseByChannel,
    purchaseByLens,
    pwaLaunch,
    askirisOverview,
    askirisByStep,
    askirisByMount,
    askirisViews,
    askirisSessions,
  ] = await Promise.all([
    queryAE(Q_OVERVIEW_TOTALS),
    queryAE(Q_OVERVIEW_UNIQUES),
    queryAE(Q_LOCALE_SPLIT),
    queryAE(Q_REFERRER),
    queryAE(Q_SEARCH_ZERO),
    queryAE(Q_SEARCH_ALL),
    queryAE(Q_FILTER_USAGE),
    queryAE(Q_FILTER_DIMENSIONS),
    queryAE(Q_COMPARE_FUNNEL),
    queryAE(Q_COMPARE_COMBOS),
    queryAE(Q_LENS_VIEW_TOP),
    queryAE(Q_FEEDBACK),
    queryAE(Q_SHARE),
    queryAE(Q_SHARE_BY_SOURCE),
    queryAE(Q_INSTALL),
    queryAE(Q_MOUNT_SWITCH),
    queryAE(Q_OUTBOUND),
    queryAE(Q_OUTBOUND_BY_SOURCE),
    queryAE(Q_PURCHASE_BY_CHANNEL),
    queryAE(Q_PURCHASE_BY_LENS),
    queryAE(Q_PWA_LAUNCH),
    queryAE(Q_ASKIRIS_OVERVIEW),
    queryAE(Q_ASKIRIS_BY_STEP),
    queryAE(Q_ASKIRIS_BY_MOUNT),
    queryAE(Q_ASKIRIS_VIEWS),
    queryAE(Q_ASKIRIS_SESSIONS),
  ]);

  if (overviewTotals.error === "missing_credentials") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-heading text-2xl font-bold">Analytics not configured</h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Set <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">CF_ACCOUNT_ID</code> and{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">CF_ANALYTICS_TOKEN</code>{" "}
          on the Worker to enable this dashboard. The token must have{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">Account · Analytics · Read</code>{" "}
          permission.
        </p>
      </main>
    );
  }

  const overviewTotalsRow = overviewTotals.data[0] as
    | { events?: number; sessions?: number }
    | undefined;

  // Q_OVERVIEW_UNIQUES returns one row per event class.
  const uniquesByEvent = new Map<string, unknown>();
  for (const r of overviewUniques.data as Array<{ event?: string; uniques?: number }>) {
    if (r.event) {
      uniquesByEvent.set(r.event, r.uniques);
    }
  }

  // Q_COMPARE_FUNNEL returns one row per step.
  const funnelByStep = new Map<string, { n: number; sids: number }>();
  for (const r of compareFunnel.data as Array<{ step?: string; n?: number; sids?: number }>) {
    if (r.step) {
      funnelByStep.set(r.step, { n: num(r.n), sids: num(r.sids) });
    }
  }
  const adds = funnelByStep.get("compare_add")?.n ?? 0;
  const views = funnelByStep.get("compare_view")?.n ?? 0;
  const scrolls = funnelByStep.get("compare_scroll")?.n ?? 0;
  const sidsAdd = funnelByStep.get("compare_add")?.sids ?? 0;
  const sidsView = funnelByStep.get("compare_view")?.sids ?? 0;
  const sidsScroll = funnelByStep.get("compare_scroll")?.sids ?? 0;

  const installCount = num((install.data[0] as { n?: number } | undefined)?.n);

  // Surface non-credential query failures so a 0/empty card can be told
  // apart from "AE call actually failed and we silently rendered nothing".
  const queryErrors = (
    [
      ["overviewTotals", overviewTotals],
      ["overviewUniques", overviewUniques],
      ["localeSplit", localeSplit],
      ["referrers", referrers],
      ["searchZero", searchZero],
      ["searchAll", searchAll],
      ["filterUsage", filterUsage],
      ["filterDimensions", filterDimensions],
      ["compareFunnel", compareFunnel],
      ["compareCombos", compareCombos],
      ["lensViews", lensViews],
      ["feedback", feedback],
      ["share", share],
      ["shareBySource", shareBySource],
      ["install", install],
      ["mountSwitch", mountSwitch],
      ["outbound", outbound],
      ["outboundBySource", outboundBySource],
      ["purchaseByChannel", purchaseByChannel],
      ["purchaseByLens", purchaseByLens],
      ["pwaLaunch", pwaLaunch],
      ["askirisOverview", askirisOverview],
      ["askirisByStep", askirisByStep],
      ["askirisByMount", askirisByMount],
      ["askirisViews", askirisViews],
      ["askirisSessions", askirisSessions],
    ] as const
  ).flatMap(([name, r]) =>
    r.error && r.error !== "missing_credentials" ? [{ name, code: r.error }] : [],
  );

  // Pre-format rows so JSX cells stay simple and `title` tooltips can
  // reference the original strings.
  const compareCombosRows = compareCombos.data.map((r) => ({
    ...r,
    display: formatLensSlugList(String(r.slugs ?? "")),
  }));
  const lensViewsRows = lensViews.data.map((r) => ({
    ...r,
    display: formatLensSlug(String(r.lens_slug ?? "")),
  }));
  const filterUsageRows = filterUsage.data.map((r) => ({
    ...r,
    display: formatFilterSnapshot(String(r.filters ?? "")),
  }));
  const filterDimensionRows = aggregateFilterDimensions(filterDimensions.data);
  const shareRows = share.data.map((r) => ({
    ...r,
    display: formatShareMethod(String(r.method ?? "")),
  }));
  const shareBySourceRows = shareBySource.data.map((r) => ({
    ...r,
    method_display: formatShareMethod(String(r.method ?? "")),
  }));
  const outboundRows = outbound.data.map((r) => ({
    ...r,
    display: formatHref(String(r.href ?? "")),
  }));
  const outboundBySourceRows = outboundBySource.data.map((r) => ({
    ...r,
    href_display: formatHref(String(r.href ?? "")),
  }));
  const referrerRows = referrers.data.map((r) => ({
    ...r,
    display: formatHref(String(r.referrer ?? "")),
  }));
  const purchaseByLensRows = purchaseByLens.data.map((r) => ({
    ...r,
    display: formatLensSlug(String(r.lens_id ?? "")),
  }));

  // AskIris overview is a single aggregate row; fan its derived rates + cost out here.
  const askirisRow = askirisOverview.data[0] as
    | {
        turns?: number;
        total_tokens?: number;
        input_tokens?: number;
        output_tokens?: number;
        cache_read_tokens?: number;
        total_steps?: number;
        budget_hits?: number;
      }
    | undefined;
  const aiTurns = num(askirisRow?.turns);
  const aiTotalTokens = num(askirisRow?.total_tokens);
  const aiInputTokens = num(askirisRow?.input_tokens);
  const aiOutputTokens = num(askirisRow?.output_tokens);
  const aiCacheReadTokens = num(askirisRow?.cache_read_tokens);
  const aiTotalSteps = num(askirisRow?.total_steps);
  const aiBudgetHits = num(askirisRow?.budget_hits);
  const aiCostCny = askirisCostCny(aiInputTokens, aiCacheReadTokens, aiOutputTokens);
  // Session funnel: page views/visitors (askiris_view) → interacted visitors →
  // sessions → turns. "Person" is approximated by the visit sid (no login).
  const aiViewsRow = askirisViews.data[0] as { pv?: number; uv?: number } | undefined;
  const aiSessionsRow = askirisSessions.data[0] as
    | { interacted_uv?: number; sessions?: number; turns?: number }
    | undefined;
  const aiUv = num(aiViewsRow?.uv);
  const aiInteractedUv = num(aiSessionsRow?.interacted_uv);
  const aiSessions = num(aiSessionsRow?.sessions);
  const aiSessionTurns = num(aiSessionsRow?.turns);
  const askirisByMountRows = askirisByMount.data.map((r) => ({
    ...r,
    total_tokens: fmtNum(num(r.total_tokens)),
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Last 30 days · numbers adjusted for sampling
        </p>
      </header>

      {queryErrors.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">
            {queryErrors.length} {queryErrors.length === 1 ? "query" : "queries"} failed
          </p>
          <ul className="mt-2 list-disc pl-5">
            {queryErrors.map((e) => (
              <li key={e.name}>
                <code>{e.name}</code> → {e.code}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overview stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Events" value={fmtMaybe(overviewTotalsRow?.events)} />
        <Stat label="Sessions" value={fmtMaybe(overviewTotalsRow?.sessions)} />
        <Stat label="Unique queries" value={fmtMaybe(uniquesByEvent.get("search"))} />
        <Stat label="Unique lenses viewed" value={fmtMaybe(uniquesByEvent.get("lens_view"))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Locale · split">
          <Table
            rows={localeSplit.data}
            columns={[
              { key: "locale", label: "Locale" },
              { key: "events", label: "Events", align: "right", widthClass: COUNT_WIDTH },
              { key: "sessions", label: "Sessions", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Detail · referrer sources">
          <Table
            rows={referrerRows}
            columns={[
              { key: "display", label: "Referrer", titleKey: "referrer" },
              { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Search · zero-result queries">
          <Table
            rows={searchZero.data}
            columns={[
              { key: "query", label: "Query" },
              { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Search · top queries (any result)">
          <Table
            rows={searchAll.data}
            columns={[
              { key: "query", label: "Query" },
              { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Compare · funnel">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-400">
                <th className="pb-2 text-left font-medium">Step</th>
                <th className={`pb-2 text-right font-medium ${COUNT_WIDTH}`}>Events</th>
                <th className={`pb-2 text-right font-medium ${COUNT_WIDTH}`}>Sessions</th>
                <th className={`pb-2 text-right font-medium ${COUNT_WIDTH}`}>vs. add</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">compare_add</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNum(adds)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNum(sidsAdd)}</td>
                <td className="py-1.5 text-right tabular-nums">100%</td>
              </tr>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">compare_view</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNum(views)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNum(sidsView)}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(sidsView, sidsAdd)}</td>
              </tr>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">compare_scroll</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNum(scrolls)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNum(sidsScroll)}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(sidsScroll, sidsAdd)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Compare · hot lens combinations">
          <Table
            rows={compareCombosRows}
            columns={[
              { key: "display", label: "Lenses", titleKey: "slugs" },
              { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Filters · most-used snapshots">
          <Table
            rows={filterUsageRows}
            columns={[
              { key: "display", label: "Filters", titleKey: "filters" },
              { key: "n", label: "Applies", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Filters · per-dimension usage">
          <Table
            rows={filterDimensionRows}
            columns={[
              { key: "dimension", label: "Filter" },
              { key: "n", label: "Applies", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Detail · most-viewed lenses">
          <Table
            rows={lensViewsRows}
            columns={[
              { key: "display", label: "Lens", titleKey: "lens_slug" },
              { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Detail · avg dwell seconds (top by views)">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Not collected. SPA navigation within X-Glass doesn&rsquo;t fire{" "}
            <code>visibilitychange</code> or <code>pagehide</code>, so the
            previous dwell timing was unreliable. Pending a redesign that
            also captures client-side route exits.
          </p>
        </Card>

        <Card title="Feedback · funnel by type">
          <Table
            rows={feedback.data}
            columns={[
              { key: "feedback_type", label: "Type" },
              { key: "opens", label: "Opens", align: "right", widthClass: COUNT_WIDTH },
              { key: "submits", label: "Submits", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Share · method breakdown">
          <Table
            rows={shareRows}
            columns={[
              { key: "display", label: "Method", titleKey: "method" },
              { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Share · by source page × method">
          <Table
            rows={shareBySourceRows}
            columns={[
              { key: "source_path", label: "Source path" },
              { key: "method_display", label: "Method", titleKey: "method" },
              { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Install · PWA accepts">
          <p className="font-heading text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {fmtNum(installCount)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Accepted install prompts</p>
        </Card>

        <Card title="PWA · launches by entry">
          <Table
            rows={pwaLaunch.data}
            columns={[
              { key: "source", label: "Entry" },
              { key: "launches", label: "Launches", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Mount switch · direction">
          <Table
            rows={mountSwitch.data}
            columns={[
              { key: "from_mount", label: "From" },
              { key: "to_mount", label: "To" },
              { key: "n", label: "Switches", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Purchase · clicks by channel">
          <Table
            rows={purchaseByChannel.data}
            columns={[
              { key: "channel", label: "Channel" },
              { key: "clicks", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
              { key: "affiliate_clicks", label: "Affiliate", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Purchase · top lenses">
          <Table
            rows={purchaseByLensRows}
            columns={[
              { key: "display", label: "Lens", titleKey: "lens_id" },
              { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Outbound · top destinations">
          <Table
            rows={outboundRows}
            columns={[
              { key: "display", label: "Destination", titleKey: "href" },
              { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>

        <Card title="Outbound · by source page × destination">
          <Table
            rows={outboundBySourceRows}
            columns={[
              { key: "source_path", label: "Source path" },
              { key: "href_display", label: "Destination", titleKey: "href" },
              { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
            ]}
          />
        </Card>
      </div>

      {/* AskIris — per-turn agent metrics (server-recorded askiris_turn rows). Its
          own data source and layout, so it sits in a dedicated section. */}
      <section className="mt-10">
        <h2 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          AskIris
        </h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          One row per completed turn · cost estimated at DeepSeek V4-Flash list price
        </p>

        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Turns" value={fmtMaybe(askirisRow?.turns)} />
          <Stat label="Tokens" value={fmtMaybe(askirisRow?.total_tokens)} />
          <Stat label="Est. cost" value={aiTurns > 0 ? `¥${aiCostCny.toFixed(2)}` : "—"} />
          <Stat label="Budget-hit rate" value={pct(aiBudgetHits, aiTurns)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="AskIris · audience & sessions">
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Page views (PV)</dt>
              <dd className="text-right tabular-nums">{fmtMaybe(aiViewsRow?.pv)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Visitors (UV)</dt>
              <dd className="text-right tabular-nums">{fmtMaybe(aiViewsRow?.uv)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Interacted visitors</dt>
              <dd className="text-right tabular-nums">{fmtMaybe(aiSessionsRow?.interacted_uv)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Activation (interacted / visited)</dt>
              <dd className="text-right tabular-nums">{pct(aiInteractedUv, aiUv)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Avg turns / session</dt>
              <dd className="text-right tabular-nums">
                {aiSessions > 0 ? (aiSessionTurns / aiSessions).toFixed(1) : "—"}
              </dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Avg sessions / active visitor</dt>
              <dd className="text-right tabular-nums">
                {aiInteractedUv > 0 ? (aiSessions / aiInteractedUv).toFixed(1) : "—"}
              </dd>
            </dl>
          </Card>

          <Card title="AskIris · efficiency">
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Avg tokens / turn</dt>
              <dd className="text-right tabular-nums">
                {aiTurns > 0 ? fmtNum(Math.round(aiTotalTokens / aiTurns)) : "—"}
              </dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Avg steps / turn</dt>
              <dd className="text-right tabular-nums">
                {aiTurns > 0 ? (aiTotalSteps / aiTurns).toFixed(1) : "—"}
              </dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Cache-hit rate (input)</dt>
              <dd className="text-right tabular-nums">{pct(aiCacheReadTokens, aiInputTokens)}</dd>
            </dl>
          </Card>

          <Card title="AskIris · steps per turn">
            <Table
              rows={askirisByStep.data}
              columns={[
                { key: "steps", label: "Steps" },
                { key: "turns", label: "Turns", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>

          <Card title="AskIris · by mount">
            <Table
              rows={askirisByMountRows}
              columns={[
                { key: "mount", label: "Mount" },
                { key: "turns", label: "Turns", align: "right", widthClass: COUNT_WIDTH },
                { key: "total_tokens", label: "Tokens", align: "right", widthClass: COUNT_WIDTH },
              ]}
            />
          </Card>
        </div>
      </section>
    </main>
  );
}
