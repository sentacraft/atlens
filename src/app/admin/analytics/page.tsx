import { getCloudflareContext } from "@opennextjs/cloudflare";
import Card from "@/components/admin/AnalyticsCard";
import { AVERAGE_DAYS, D1_CUTOVER_DAY, Definitions, fmtCompact, pct } from "@/components/admin/AnalyticsUi";
import { Funnel } from "@/components/admin/Breakdown";
import StatTile from "@/components/admin/StatTile";
import TrendChart from "@/components/admin/TrendChart";
import { DAY_MS, dashboardWindows, loadDaily, loadOverview, loadSessionFunnel, type Overview } from "@/lib/analytics/dashboard";
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
    loadSessionFunnel(events, current),
    previous ? loadSessionFunnel(events, previous) : null,
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
  const zeroCounts = series((d) => d.zeroResultSearches);
  const searchCounts = series((d) => d.searches);
  const zeroRateSpark = zeroCounts.map((zero, i) => {
    const searched = searchCounts[i];
    return zero !== null && searched ? zero / searched : null;
  });
  const sessionAverages = series((d) => d.sessions);
  const trendPoints = daily.map((d, i) => ({ day: d.day, value: d.sessions, average: smooth ? sessionAverages[i] : undefined }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-zinc-500">
        Days in China time (UTC+8); internal traffic excluded. Before {D1_CUTOVER_DAY}, each 30-minute session counted as
        its own visitor, so visitor counts from that period run high.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Visitors"
          value={fmtCompact(overview.visitors)}
          definition="Browsers with at least one event, told apart by a random id kept for 30 days."
          change={change((o) => o.visitors)}
          periodLabel={periodLabel}
          spark={series((d) => d.visitors)}
        />
        <StatTile
          label="Sessions"
          value={fmtCompact(overview.sessions)}
          definition="A visitor's events with no gap longer than 30 minutes."
          change={change((o) => o.sessions)}
          periodLabel={periodLabel}
          spark={series((d) => d.sessions)}
        />
        <StatTile
          label="Lens views"
          value={fmtCompact(overview.lensViews)}
          definition="Lens detail pages opened, counted once per page load."
          change={change((o) => o.lensViews)}
          periodLabel={periodLabel}
          spark={series((d) => d.lensViews)}
        />
        <StatTile
          label="Store clicks"
          value={fmtCompact(overview.purchaseClicks)}
          definition="Clicks on a store link for a lens, on lens pages and in comparisons."
          change={change((o) => o.purchaseClicks)}
          periodLabel={periodLabel}
          spark={series((d) => d.purchaseClicks)}
        />
        <StatTile
          label="Iris turns"
          value={fmtCompact(overview.irisTurns)}
          definition="Questions Iris answered; one question and its answer is one turn."
          change={change((o) => o.irisTurns)}
          periodLabel={periodLabel}
          spark={series((d) => d.irisTurns)}
        />
        <StatTile
          label="Zero-result searches"
          value={pct(overview.zeroResultSearches, overview.searches)}
          definition="Share of lens searches that matched no lens. The trend line is the same share per day."
          change={zeroRateChange}
          upIsGood={false}
          periodLabel={periodLabel}
          spark={zeroRateSpark}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Sessions per day"
          subtitle={smooth ? `Bars per day, line a ${AVERAGE_DAYS}-day average` : "Bars per day"}
          className="lg:col-span-2"
          info={
            <Definitions
              items={[
                { term: "Session", description: "A visitor's events with no gap longer than 30 minutes" },
                { term: "Day", description: "A calendar day in China time (UTC+8)" },
                { term: "Average", description: `The mean of the day and the ${AVERAGE_DAYS - 1} days before it` },
              ]}
            />
          }
        >
          {trendPoints.length > 0 ? (
            <TrendChart points={trendPoints} valueLabel="Sessions" averageLabel={smooth ? `${AVERAGE_DAYS}-day average` : undefined} />
          ) : (
            <p className="text-sm text-zinc-500">No data in this range.</p>
          )}
        </Card>
        <Card
          title="Session funnel"
          subtitle="Sessions that reached each step, in any order"
          info={
            <div className="space-y-2">
              <p>
                Each step counts the sessions with at least one such event. A session can skip a step, such as opening a
                lens page from a link without searching, so a step is not a subset of the one above.
              </p>
              <Definitions
                items={[
                  { term: "Searched or filtered", description: "Typed in the lens search or changed the browse filters" },
                  { term: "Viewed a lens", description: "Opened a lens's detail page" },
                  { term: "Opened a comparison", description: "Opened the comparison page with lenses in it" },
                  { term: "Clicked through to a store", description: "Clicked a store link for a lens" },
                ]}
              />
            </div>
          }
        >
          <Funnel steps={funnel} unit="Sessions" nested={false} previous={previousFunnel} />
        </Card>
      </div>
    </main>
  );
}
