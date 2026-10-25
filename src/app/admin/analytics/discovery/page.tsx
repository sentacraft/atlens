import { getCloudflareContext } from "@opennextjs/cloudflare";
import Card from "@/components/admin/AnalyticsCard";
import { COUNT_WIDTH, EventDefinitions, Table } from "@/components/admin/AnalyticsUi";
import { Funnel } from "@/components/admin/Breakdown";
import { countBy, dashboardWindows, dayOf, loadFirstEventTs, loadSearchFunnel } from "@/lib/analytics/dashboard";
import { aggregateFilterDimensions, formatHref, formatLensSlug, formatLensSlugList, topFilterSnapshots } from "@/lib/analytics/format";
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
  // Picks started being recorded with page views, after searches; the search funnel counts only the
  // searches since then. Every page load records its page view before any search on it.
  const picksSince = await loadFirstEventTs(events, "page_view");
  const pickWindow = { from: Math.max(current.from, picksSince ?? current.to), to: current.to };

  const [searchZero, searchTop, lensViews, referrers, compareCombos, filterAll, searchFunnel, searchPicks, pageViews, pagePaths] =
    await Promise.all([
      countBy(events, current, "search", ["query"], { where: { results_count: 0 } }),
      countBy(events, current, "search", ["query"]),
      countBy(events, current, "lens_view", ["lens_slug"]),
      countBy(events, current, "lens_view", ["referrer"], { limit: 15 }),
      countBy(events, current, "compare_view", ["lens_slugs"]),
      countBy(events, current, "filter_apply", ["filters_json"], { limit: 1000 }),
      loadSearchFunnel(events, pickWindow),
      countBy(events, current, "search_select", ["lens_id"]),
      countBy(events, current, "page_view", ["path"]),
      countBy(events, current, "page_view", ["from_path", "path"], { limit: 30 }),
    ]);

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card
        title="Search funnel"
        subtitle={picksSince ? `Searches since ${dayOf(pickWindow.from)}, when picks started being recorded` : "Searches"}
        className="lg:col-span-2"
        info={
          <div className="grid gap-4 md:grid-cols-2">
            <EventDefinitions title="Searches, and those with results" event="search" fields={["results_count"]} />
            <EventDefinitions title="A result was picked · split by its position" event="search_select" fields={["rank"]} />
          </div>
        }
      >
        <Funnel steps={searchFunnel} unit="Searches" nested previous={null} />
      </Card>
      <Card
        title="Search · zero-result queries"
        subtitle="Searches that matched no lens, by query"
        info={<EventDefinitions event="search" fields={["results_count"]} />}
      >
        <Table rows={searchZero} columns={[{ key: "query", label: "Query" }, { key: "n", label: "Searches", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
      <Card title="Search · top queries" subtitle="All searches, by query" info={<EventDefinitions event="search" />}>
        <Table rows={searchTop} columns={[{ key: "query", label: "Query" }, { key: "n", label: "Searches", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
      <Card title="Search · most-picked lenses" subtitle="Results picked, by lens" info={<EventDefinitions event="search_select" />}>
        <Table
          rows={searchPicks.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_id ?? "")) }))}
          columns={[{ key: "display", label: "Lens", titleKey: "lens_id" }, { key: "n", label: "Picks", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Pages · most viewed" subtitle="Page views, by page" info={<EventDefinitions event="page_view" />}>
        <Table rows={pageViews} columns={[{ key: "path", label: "Page" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
      <Card
        title="Pages · in-site paths"
        subtitle="Moves within the site, top 30 pairs"
        info={<EventDefinitions event="page_view" fields={["from_path"]} />}
      >
        <Table
          rows={pagePaths.filter((r) => r.from_path)}
          columns={[
            { key: "from_path", label: "From" },
            { key: "path", label: "To" },
            { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card title="Lens pages · most viewed" subtitle="Lens page views, by lens" info={<EventDefinitions event="lens_view" />}>
        <Table
          rows={lensViews.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_slug ?? "")) }))}
          columns={[{ key: "display", label: "Lens", titleKey: "lens_slug" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card
        title="Lens pages · referrers"
        subtitle="Lens page views, by the page before; top 15"
        info={<EventDefinitions event="lens_view" fields={["referrer"]} />}
      >
        <Table
          rows={referrers.filter((r) => r.referrer).map((r) => ({ ...r, display: formatHref(String(r.referrer)) }))}
          columns={[{ key: "display", label: "Referrer", titleKey: "referrer" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Compare · lens combinations" subtitle="Comparison page views, by the lenses in them" info={<EventDefinitions event="compare_view" />}>
        <Table
          rows={compareCombos.map((r) => ({ ...r, display: formatLensSlugList(String(r.lens_slugs ?? "")) }))}
          columns={[{ key: "display", label: "Lenses", titleKey: "lens_slugs" }, { key: "n", label: "Views", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card
        title="Filters · per dimension"
        subtitle="Filter changes that used each kind of filter"
        info={
          <div className="space-y-2">
            <EventDefinitions event="filter_apply" />
            <p>One change can use several kinds of filter, so the rows add up to more than the changes.</p>
          </div>
        }
      >
        <Table
          rows={aggregateFilterDimensions(filterAll.map((r) => ({ filters: r.filters_json, n: r.n })))}
          columns={[{ key: "dimension", label: "Filter" }, { key: "n", label: "Changes", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card
        title="Filters · most-used combinations"
        subtitle="Filter changes, by every filter set at that moment; top 10"
        className="lg:col-span-2"
        info={<EventDefinitions event="filter_apply" fields={["filters_json"]} />}
      >
        <Table
          rows={topFilterSnapshots(filterAll, 10)}
          columns={[{ key: "display", label: "Filters", titleKey: "filters_json" }, { key: "n", label: "Changes", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
    </main>
  );
}
