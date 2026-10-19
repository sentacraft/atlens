import { getCloudflareContext } from "@opennextjs/cloudflare";
import { COUNT_WIDTH, Card, Facts, Table, fmtNum, pct } from "@/components/admin/AnalyticsUi";
import { countBy, dashboardWindows, loadFirstEventTs } from "@/lib/analytics/dashboard";
import { aggregateFilterDimensions, formatFilterSnapshot, formatHref, formatLensSlug, formatLensSlugList } from "@/lib/analytics/format";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const events = getCloudflareContext().env.ANALYTICS_DB;
  const { current } = await dashboardWindows(events, range);
  // Picks started being recorded with page views, after searches; the pick rate counts only the
  // searches since then. Every page load records its page view before any search on it.
  const picksSince = await loadFirstEventTs(events, "page_view");
  const pickWindow = { from: Math.max(current.from, picksSince ?? current.to), to: current.to };

  const [
    searchZero,
    searchTop,
    lensViews,
    referrers,
    compareCombos,
    filterSnapshots,
    filterAll,
    searches,
    searchPicks,
    searchPickRanks,
    pageViews,
    pagePaths,
  ] = await Promise.all([
    countBy(events, current, "search", ["query"], { where: { results_count: 0 } }),
    countBy(events, current, "search", ["query"]),
    countBy(events, current, "lens_view", ["lens_slug"]),
    countBy(events, current, "lens_view", ["referrer"], { limit: 15 }),
    countBy(events, current, "compare_view", ["lens_slugs"]),
    countBy(events, current, "filter_apply", ["filters_json"], { limit: 10 }),
    countBy(events, current, "filter_apply", ["filters_json"], { limit: 1000 }),
    countBy(events, pickWindow, "search", []),
    countBy(events, current, "search_select", ["lens_id"]),
    countBy(events, current, "search_select", ["rank"], { limit: 10 }),
    countBy(events, current, "page_view", ["path"]),
    countBy(events, current, "page_view", ["from_path", "path"], { limit: 30 }),
  ]);
  const searchCount = searches[0]?.n ?? 0;
  const pickCount = searchPicks.reduce((sum, row) => sum + row.n, 0);

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card title="Search · zero-result queries">
        <Table rows={searchZero} columns={[{ key: "query", label: "Query" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
      <Card title="Search · top queries">
        <Table rows={searchTop} columns={[{ key: "query", label: "Query" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
      <Card title="Search · results picked">
        <Facts
          items={[
            ["Searches since picks were recorded", fmtNum(searchCount)],
            ["Results picked", fmtNum(pickCount)],
            ["Picked per search", pct(pickCount, searchCount)],
          ]}
        />
        <div className="mt-3">
          <Table rows={searchPickRanks} columns={[{ key: "rank", label: "Position picked" }, { key: "n", label: "Picks", align: "right", widthClass: COUNT_WIDTH }]} />
        </div>
      </Card>
      <Card title="Search · most-picked lenses">
        <Table
          rows={searchPicks.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_id ?? "")) }))}
          columns={[{ key: "display", label: "Lens", titleKey: "lens_id" }, { key: "n", label: "Picks", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Pages · most viewed">
        <Table rows={pageViews} columns={[{ key: "path", label: "Page" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
      <Card title="Pages · in-site paths">
        <Table
          rows={pagePaths.filter((r) => r.from_path)}
          columns={[
            { key: "from_path", label: "From" },
            { key: "path", label: "To" },
            { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
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
      <Card title="Filters · most-used combinations" className="lg:col-span-2">
        <Table
          rows={filterSnapshots.map((r) => ({ ...r, display: formatFilterSnapshot(String(r.filters_json ?? "")) }))}
          columns={[{ key: "display", label: "Filters", titleKey: "filters_json" }, { key: "n", label: "Applies", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
    </main>
  );
}
