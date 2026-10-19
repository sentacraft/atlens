import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AVERAGE_DAYS, Card, D1_CUTOVER_DAY, Funnel, StatTile, fmtCompact, pct } from "@/components/admin/AnalyticsUi";
import TrendChart from "@/components/admin/TrendChart";
import { DAY_MS, dashboardWindows, loadDaily, loadFunnel, loadOverview, type Overview } from "@/lib/analytics/dashboard";
import { movingAverage, percentChange } from "@/lib/analytics/series";
import { ANALYTICS_RANGE_LABELS, resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const events = getCloudflareContext().env.ANALYTICS_DB;
  const { current, previous } = await dashboardWindows(events, range);

  const [overview, previousOverview, paddedDaily, funnel, previousFunnel] = await Promise.all([
    loadOverview(events, current),
    previous ? loadOverview(events, previous) : null,
    // The days before the range warm up the trailing average, so it starts on the range's first day.
    loadDaily(events, { from: Math.max(0, current.from - (AVERAGE_DAYS - 1) * DAY_MS), to: current.to }),
    loadFunnel(events, current),
    previous ? loadFunnel(events, previous) : null,
  ]);

  const smooth = range !== "7d";
  const warmup = current.from > 0 ? AVERAGE_DAYS - 1 : 0;
  const daily = paddedDaily.slice(warmup);
  const series = (pick: (d: (typeof paddedDaily)[number]) => number) => {
    const values = paddedDaily.map(pick);
    return (smooth ? movingAverage(values, AVERAGE_DAYS) : values).slice(warmup);
  };
  const periodLabel = ANALYTICS_RANGE_LABELS[range].toLowerCase();
  const change = (pick: (o: Overview) => number) => percentChange(pick(overview), previousOverview ? pick(previousOverview) : null);
  const zeroRate = (o: Overview) => (o.searches > 0 ? o.zeroResultSearches / o.searches : 0);
  const zeroRateChange =
    previousOverview && previousOverview.searches > 0 ? percentChange(zeroRate(overview), zeroRate(previousOverview)) : null;
  const sessionAverages = series((d) => d.sessions);
  const trendPoints = daily.map((d, i) => ({ day: d.day, value: d.sessions, average: smooth ? sessionAverages[i] : undefined }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-zinc-500">
        Days in China time (UTC+8); internal traffic excluded. Before {D1_CUTOVER_DAY}, each 30-minute session counted as
        its own visitor, so visitor counts from that period run high.
      </p>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
    </main>
  );
}
