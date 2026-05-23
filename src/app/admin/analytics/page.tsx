// Analytics dashboard. Reads from the `xglass_events` Analytics Engine
// dataset via the SQL API. All queries cover the last 30 days unless
// stated otherwise.
//
// Access control: Cloudflare Access in production (see PR description).
// The route itself is open — auth lives one layer above at the platform.

import { queryAE } from "@/lib/analytics-query";
import {
  formatFilterSnapshot,
  formatHref,
  formatLensSlug,
  formatLensSlugList,
  formatShareMethod,
} from "@/lib/analytics-format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW = "INTERVAL '30' DAY";
const DASHBOARD_FILTER = `timestamp > NOW() - ${WINDOW} AND blob6 != '1'`;

const Q_OVERVIEW = `
  SELECT
    SUM(_sample_interval) AS events,
    uniq(blob1) AS sessions,
    uniqIf(blob4, index1 = 'search') AS unique_queries,
    uniqIf(blob4, index1 = 'lens_view') AS unique_lenses_viewed
  FROM xglass_events
  WHERE ${DASHBOARD_FILTER}
`;

const Q_LOCALE_SPLIT = `
  SELECT
    blob2 AS locale,
    SUM(_sample_interval) AS events,
    uniq(blob1) AS sessions
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

const Q_COMPARE_FUNNEL = `
  SELECT
    sumIf(_sample_interval, index1 = 'compare_add') AS adds,
    sumIf(_sample_interval, index1 = 'compare_view') AS views,
    sumIf(_sample_interval, index1 = 'compare_scroll') AS scrolls,
    uniqIf(blob1, index1 = 'compare_add') AS sids_add,
    uniqIf(blob1, index1 = 'compare_view') AS sids_view,
    uniqIf(blob1, index1 = 'compare_scroll') AS sids_scroll
  FROM xglass_events
  WHERE index1 IN ('compare_add', 'compare_view', 'compare_scroll')
    AND ${DASHBOARD_FILTER}
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
    overview,
    localeSplit,
    referrers,
    searchZero,
    searchAll,
    filterUsage,
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
  ] = await Promise.all([
    queryAE(Q_OVERVIEW),
    queryAE(Q_LOCALE_SPLIT),
    queryAE(Q_REFERRER),
    queryAE(Q_SEARCH_ZERO),
    queryAE(Q_SEARCH_ALL),
    queryAE(Q_FILTER_USAGE),
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
  ]);

  if (overview.error === "missing_credentials") {
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

  const overviewRow = overview.data[0] as
    | {
        events?: number;
        sessions?: number;
        unique_queries?: number;
        unique_lenses_viewed?: number;
      }
    | undefined;

  const funnel = compareFunnel.data[0] as
    | {
        adds?: number;
        views?: number;
        scrolls?: number;
        sids_add?: number;
        sids_view?: number;
        sids_scroll?: number;
      }
    | undefined;
  const adds = num(funnel?.adds);
  const views = num(funnel?.views);
  const scrolls = num(funnel?.scrolls);
  const sidsAdd = num(funnel?.sids_add);
  const sidsView = num(funnel?.sids_view);
  const sidsScroll = num(funnel?.sids_scroll);

  const installCount = num((install.data[0] as { n?: number } | undefined)?.n);

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

      {/* Overview stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Events" value={fmtNum(num(overviewRow?.events))} />
        <Stat label="Sessions" value={fmtNum(num(overviewRow?.sessions))} />
        <Stat label="Unique queries" value={fmtNum(num(overviewRow?.unique_queries))} />
        <Stat label="Unique lenses viewed" value={fmtNum(num(overviewRow?.unique_lenses_viewed))} />
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
    </main>
  );
}
