import { getCloudflareContext } from "@opennextjs/cloudflare";
import Card from "@/components/admin/AnalyticsCard";
import { COUNT_WIDTH, Definitions, EventDefinitions, Facts, Table, fmtNum, pct } from "@/components/admin/AnalyticsUi";
import { BreakdownTree, Funnel } from "@/components/admin/Breakdown";
import { groupNode } from "@/lib/analytics/breakdown";
import {
  dashboardWindows,
  loadBreakdown,
  loadConversationsPerVisitor,
  loadIris,
  loadIrisFeedback,
  loadIrisFunnel,
} from "@/lib/analytics/dashboard";
import { valueLabel } from "@/lib/analytics/events";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

const tokens = (value: number | null) => (value === null ? "—" : `${fmtNum(value)} tokens`);

export default async function AnalyticsIrisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const { env } = getCloudflareContext();
  const events = env.ANALYTICS_DB;
  const { current } = await dashboardWindows(events, range);
  const [iris, feedback, funnel, perVisitor, opens, messages, newConversations, contextRemovals] = await Promise.all([
    loadIris(events, current),
    loadIrisFeedback(env.ASKIRIS_DB, current),
    loadIrisFunnel(events, current),
    loadConversationsPerVisitor(events, current),
    loadBreakdown(events, current, "askiris_open", ["entry", "surface"]),
    loadBreakdown(events, current, "askiris_message", ["method", "pool"]),
    loadBreakdown(events, current, "askiris_new_conversation", ["reason"]),
    loadBreakdown(events, current, "askiris_context_remove", ["page_kind"]),
  ]);
  const ratings = feedback.helpful + feedback.unhelpful;

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
      <Card
        title="Iris funnel"
        subtitle="Unique visitors · each step keeps only visitors from the step above"
        className="md:col-span-2 lg:col-span-3"
        info={
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-zinc-900">All visitors</p>
              <p>Browsers with any event in the range, told apart by a random id kept for 30 days; internal traffic left out.</p>
              <EventDefinitions title="Opened Iris" event="askiris_view" />
            </div>
            <EventDefinitions title="Opened Iris · split by where they first opened it" event="askiris_open" fields={["entry", "pool"]} />
            <EventDefinitions title="Asked a question · split by their first message" event="askiris_message" fields={["method", "pool"]} />
            <EventDefinitions title="Clicked a recommendation · split by their first click" event="askiris_rec_click" fields={["source"]} />
          </div>
        }
      >
        <Funnel steps={funnel} unit="Unique visitors" nested previous={null} />
      </Card>
      <Card
        title="Opens"
        subtitle="Every opening, by where and as what"
        info={<EventDefinitions event="askiris_open" fields={["entry", "surface"]} />}
      >
        <BreakdownTree nodes={opens} unit="Opens" />
      </Card>
      <Card
        title="Messages"
        subtitle="Every message, by how it was sent"
        info={<EventDefinitions event="askiris_message" fields={["method", "pool"]} />}
      >
        <BreakdownTree nodes={messages} unit="Messages" />
      </Card>
      <Card
        title="Conversations"
        subtitle="How many each visitor has, how long they run, and why new ones start"
        info={
          <div className="space-y-3">
            <Definitions
              items={[
                { term: "Turn", description: "One question to Iris and its answer" },
                { term: "Conversation", description: "Turns that share one chat thread" },
                {
                  term: "Asking visitor",
                  description: "A browser with at least one answered turn, told apart by a random id kept for 30 days; not an account",
                },
                { term: "Came back", description: "Asking visitors with a second conversation in the range" },
              ]}
            />
            <EventDefinitions event="askiris_new_conversation" fields={["reason"]} />
            <EventDefinitions event="askiris_context_remove" fields={["page_kind"]} />
          </div>
        }
      >
        <Facts
          items={[
            ["Conversations", fmtNum(iris.conversations)],
            ["Turns", fmtNum(iris.turns)],
            ["Turns per conversation", iris.conversations > 0 ? (iris.turns / iris.conversations).toFixed(1) : "—"],
            ["Asking visitors", fmtNum(perVisitor.askers)],
            [
              "Conversations per asking visitor",
              perVisitor.askers > 0 ? (perVisitor.conversations / perVisitor.askers).toFixed(1) : "—",
            ],
            ["Came back", `${fmtNum(perVisitor.returning)} visitors · ${pct(perVisitor.returning, perVisitor.askers)}`],
          ]}
        />
        <div className="mt-4 space-y-4">
          <BreakdownTree nodes={[groupNode("Asking visitors", perVisitor.distribution)]} unit="Visitors" />
          <BreakdownTree nodes={[groupNode("New conversations", newConversations)]} unit="Events" />
          <BreakdownTree nodes={[groupNode("Page context removed", contextRemovals)]} unit="Events" />
        </div>
      </Card>
      <Card
        title="Reply ratings"
        subtitle="Turns rated, then how"
        info={
          <p>
            A rating is a thumbs up or down under one of Iris&apos;s replies. Ratings are stored with the conversation, not
            the visitor, so they count turns.
          </p>
        }
      >
        <Facts
          items={[
            ["Rated", `${fmtNum(ratings)} turns · ${pct(ratings, iris.turns)} of turns`],
            ["Helpful", `${fmtNum(feedback.helpful)} turns · ${pct(feedback.helpful, ratings)} of rated`],
            ["Not helpful", `${fmtNum(feedback.unhelpful)} turns · ${pct(feedback.unhelpful, ratings)} of rated`],
          ]}
        />
      </Card>
      <Card
        title="Cost and limits"
        subtitle="Model use across all turns"
        info={
          <Definitions
            items={[
              { term: "Step", description: "One model call; a turn takes more than one when Iris uses tools, up to the step limit" },
              { term: "Cache hit", description: "Input tokens read from the prompt cache, as a share of all input tokens" },
              {
                term: "Peak input",
                description:
                  "Each conversation's largest single model call: system prompt, history and tool results. Shows how close conversations come to the context limit",
              },
            ]}
          />
        }
      >
        <Facts
          items={[
            ["Tokens", tokens(iris.totalTokens)],
            ["Per turn", iris.turns > 0 ? tokens(Math.round(iris.totalTokens / iris.turns)) : "—"],
            ["Steps per turn", iris.turns > 0 ? `${(iris.steps / iris.turns).toFixed(1)} steps` : "—"],
            ["Cache hit", `${pct(iris.cacheReadTokens, iris.inputTokens)} of input tokens`],
            ["Hit the step limit", `${fmtNum(iris.budgetHits)} turns · ${pct(iris.budgetHits, iris.turns)}`],
            ["Peak input, median conversation", tokens(iris.contextP50)],
            ["Peak input, 75th percentile", tokens(iris.contextP75)],
            ["Peak input, largest conversation", tokens(iris.contextMax)],
          ]}
        />
      </Card>
      <Card
        title="Steps per turn"
        subtitle="Turns by how many model calls they took"
        info={<EventDefinitions event="askiris_turn" fields={["step_count"]} />}
      >
        <Table
          rows={iris.stepsHistogram}
          columns={[{ key: "steps", label: "Steps" }, { key: "turns", label: "Turns", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="By mount" subtitle="Turns and tokens by lens catalog" info={<EventDefinitions event="askiris_turn" fields={["mount"]} />}>
        <Table
          rows={iris.byMount.map((row) => ({ ...row, mount: valueLabel("askiris_turn", "mount", row.mount) }))}
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
