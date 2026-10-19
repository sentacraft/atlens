import { getCloudflareContext } from "@opennextjs/cloudflare";
import { COUNT_WIDTH, Card, Facts, Table, fmtNum, pct } from "@/components/admin/AnalyticsUi";
import { dashboardWindows, loadIris, loadIrisFeedback } from "@/lib/analytics/dashboard";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsIrisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const { env } = getCloudflareContext();
  const { current } = await dashboardWindows(env.ANALYTICS_DB, range);
  const [iris, feedback] = await Promise.all([loadIris(env.ANALYTICS_DB, current), loadIrisFeedback(env.ASKIRIS_DB, current)]);
  const ratings = feedback.helpful + feedback.unhelpful;

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
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
            ["Helpful", fmtNum(feedback.helpful)],
            ["Not helpful", fmtNum(feedback.unhelpful)],
            ["Helpful share", pct(feedback.helpful, ratings)],
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
            [
              "Context p50 / p75 / max",
              [iris.contextP50, iris.contextP75, iris.contextMax].map((v) => (v === null ? "—" : fmtNum(v))).join(" / "),
            ],
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
    </main>
  );
}
