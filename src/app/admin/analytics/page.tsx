// Analytics dashboard. Reads from the `xglass_events` Analytics Engine
// dataset via the SQL API. All queries cover the last 30 days unless
// stated otherwise.
//
// Access control: Cloudflare Access in production (see PR description).
// The route itself is open — auth lives one layer above at the platform.

import { queryAE } from "@/lib/analytics-query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW = "INTERVAL '30' DAY";

const Q_SEARCH_ZERO = `
  SELECT blob4 AS query, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'search' AND double1 = 0
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY query
  ORDER BY n DESC
  LIMIT 20
`;

const Q_SEARCH_ALL = `
  SELECT blob4 AS query, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'search'
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY query
  ORDER BY n DESC
  LIMIT 20
`;

const Q_FILTER_USAGE = `
  SELECT blob4 AS filters, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'filter_apply'
    AND timestamp > NOW() - ${WINDOW}
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
    AND timestamp > NOW() - ${WINDOW}
`;

const Q_COMPARE_COMBOS = `
  SELECT blob5 AS slugs, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'compare_view' AND blob5 != ''
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY slugs
  ORDER BY n DESC
  LIMIT 20
`;

const Q_LENS_VIEW_TOP = `
  SELECT blob4 AS lens_slug, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'lens_view'
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY lens_slug
  ORDER BY n DESC
  LIMIT 20
`;

const Q_LENS_DWELL = `
  SELECT
    blob4 AS lens_slug,
    ROUND(SUM(_sample_interval * double1) / SUM(_sample_interval)) AS avg_seconds,
    SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'lens_dwell' AND double1 > 0
    AND timestamp > NOW() - ${WINDOW}
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
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY feedback_type
`;

const Q_SHARE = `
  SELECT blob5 AS method, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'share_action'
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY method
  ORDER BY n DESC
`;

const Q_INSTALL = `
  SELECT SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'install_action'
    AND timestamp > NOW() - ${WINDOW}
`;

const Q_MOUNT_SWITCH = `
  SELECT
    blob5 AS from_mount,
    blob4 AS to_mount,
    SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'mount_switch'
    AND timestamp > NOW() - ${WINDOW}
  GROUP BY from_mount, to_mount
  ORDER BY n DESC
`;

const Q_OUTBOUND = `
  SELECT blob4 AS href, SUM(_sample_interval) AS n
  FROM xglass_events
  WHERE index1 = 'outbound_click'
    AND timestamp > NOW() - ${WINDOW}
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
    AND timestamp > NOW() - ${WINDOW}
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
    AND timestamp > NOW() - ${WINDOW}
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({
  rows,
  columns,
}: {
  rows: Array<Record<string, unknown>>;
  columns: { key: string; label: string; align?: "left" | "right" }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">No data yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-zinc-400">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`pb-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
            {columns.map((c) => (
              <td
                key={c.key}
                className={`py-1.5 ${c.align === "right" ? "text-right tabular-nums" : "text-left"} ${c.align !== "right" ? "truncate max-w-[24rem]" : ""}`}
              >
                {String(r[c.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AnalyticsDashboardPage() {
  const [
    searchZero,
    searchAll,
    filterUsage,
    compareFunnel,
    compareCombos,
    lensViews,
    lensDwell,
    feedback,
    share,
    shareBySource,
    install,
    mountSwitch,
    outbound,
    outboundBySource,
  ] = await Promise.all([
    queryAE(Q_SEARCH_ZERO),
    queryAE(Q_SEARCH_ALL),
    queryAE(Q_FILTER_USAGE),
    queryAE(Q_COMPARE_FUNNEL),
    queryAE(Q_COMPARE_COMBOS),
    queryAE(Q_LENS_VIEW_TOP),
    queryAE(Q_LENS_DWELL),
    queryAE(Q_FEEDBACK),
    queryAE(Q_SHARE),
    queryAE(Q_SHARE_BY_SOURCE),
    queryAE(Q_INSTALL),
    queryAE(Q_MOUNT_SWITCH),
    queryAE(Q_OUTBOUND),
    queryAE(Q_OUTBOUND_BY_SOURCE),
  ]);

  if (searchZero.error === "missing_credentials") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold">Analytics not configured</h1>
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

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Analytics — last 30 days</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Counts are sampling-corrected via <code>SUM(_sample_interval)</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Search · zero-result queries">
          <Table
            rows={searchZero.data}
            columns={[
              { key: "query", label: "Query" },
              { key: "n", label: "Count", align: "right" },
            ]}
          />
        </Card>

        <Card title="Search · top queries (any result)">
          <Table
            rows={searchAll.data}
            columns={[
              { key: "query", label: "Query" },
              { key: "n", label: "Count", align: "right" },
            ]}
          />
        </Card>

        <Card title="Compare · funnel">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-400">
                <th className="pb-2 text-left font-medium">Step</th>
                <th className="pb-2 text-right font-medium">Events</th>
                <th className="pb-2 text-right font-medium">Sessions</th>
                <th className="pb-2 text-right font-medium">vs. add</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">compare_add</td>
                <td className="py-1.5 text-right tabular-nums">{adds}</td>
                <td className="py-1.5 text-right tabular-nums">{sidsAdd}</td>
                <td className="py-1.5 text-right tabular-nums">100%</td>
              </tr>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">compare_view</td>
                <td className="py-1.5 text-right tabular-nums">{views}</td>
                <td className="py-1.5 text-right tabular-nums">{sidsView}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(sidsView, sidsAdd)}</td>
              </tr>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5">compare_scroll</td>
                <td className="py-1.5 text-right tabular-nums">{scrolls}</td>
                <td className="py-1.5 text-right tabular-nums">{sidsScroll}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(sidsScroll, sidsAdd)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Compare · hot lens combinations">
          <Table
            rows={compareCombos.data}
            columns={[
              { key: "slugs", label: "Slugs" },
              { key: "n", label: "Views", align: "right" },
            ]}
          />
        </Card>

        <Card title="Filters · most-used snapshots">
          <Table
            rows={filterUsage.data}
            columns={[
              { key: "filters", label: "Filters JSON" },
              { key: "n", label: "Applies", align: "right" },
            ]}
          />
        </Card>

        <Card title="Detail · most-viewed lenses">
          <Table
            rows={lensViews.data}
            columns={[
              { key: "lens_slug", label: "Lens" },
              { key: "n", label: "Views", align: "right" },
            ]}
          />
        </Card>

        <Card title="Detail · avg dwell seconds (top by views)">
          <Table
            rows={lensDwell.data}
            columns={[
              { key: "lens_slug", label: "Lens" },
              { key: "avg_seconds", label: "Avg sec", align: "right" },
              { key: "n", label: "Dwell events", align: "right" },
            ]}
          />
        </Card>

        <Card title="Feedback · funnel by type">
          <Table
            rows={feedback.data}
            columns={[
              { key: "feedback_type", label: "Type" },
              { key: "opens", label: "Opens", align: "right" },
              { key: "submits", label: "Submits", align: "right" },
            ]}
          />
        </Card>

        <Card title="Share · method breakdown">
          <Table
            rows={share.data}
            columns={[
              { key: "method", label: "Method" },
              { key: "n", label: "Count", align: "right" },
            ]}
          />
        </Card>

        <Card title="Share · by source page × method">
          <Table
            rows={shareBySource.data}
            columns={[
              { key: "source_path", label: "Source path" },
              { key: "method", label: "Method" },
              { key: "n", label: "Count", align: "right" },
            ]}
          />
        </Card>

        <Card title="Install · PWA accepts">
          <p className="text-3xl font-bold tabular-nums">{installCount}</p>
          <p className="mt-1 text-xs text-zinc-500">Accepted install prompts</p>
        </Card>

        <Card title="Mount switch · direction">
          <Table
            rows={mountSwitch.data}
            columns={[
              { key: "from_mount", label: "From" },
              { key: "to_mount", label: "To" },
              { key: "n", label: "Switches", align: "right" },
            ]}
          />
        </Card>

        <Card title="Outbound · top destinations">
          <Table
            rows={outbound.data}
            columns={[
              { key: "href", label: "Href" },
              { key: "n", label: "Clicks", align: "right" },
            ]}
          />
        </Card>

        <Card title="Outbound · by source page × destination">
          <Table
            rows={outboundBySource.data}
            columns={[
              { key: "source_path", label: "Source path" },
              { key: "href", label: "Destination" },
              { key: "n", label: "Clicks", align: "right" },
            ]}
          />
        </Card>
      </div>
    </main>
  );
}
