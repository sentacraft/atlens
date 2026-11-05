import { getCloudflareContext } from "@opennextjs/cloudflare";
import Card from "@/components/admin/AnalyticsCard";
import { COUNT_WIDTH, EventDefinitions, Table, pct } from "@/components/admin/AnalyticsUi";
import { BreakdownTree, Funnel } from "@/components/admin/Breakdown";
import { countBy, dashboardWindows, loadBreakdown, loadVisitorFunnel } from "@/lib/analytics/dashboard";
import { valueLabel } from "@/lib/analytics/events";
import { SUPPORT_ENTRIES } from "@/lib/support";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

/** The entries that also show a prompt on their own; the prompt's name is the entry's. */
const PROMPTED = new Set<string>(["revisit", "poster_toast", "iris_helpful"]);

export default async function AnalyticsSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const events = getCloudflareContext().env.ANALYTICS_DB;
  const { current } = await dashboardWindows(events, range);

  const [funnel, opened, prompts, channels, devices, openedByLocale, clickedByLocale] = await Promise.all([
    loadVisitorFunnel(events, current, [
      { label: "All visitors", events: null },
      { label: "Opened the support dialog", events: ["support_open"], split: { event: "support_open", levels: ["entry"] } },
      {
        label: "Clicked through",
        events: ["support_channel"],
        where: { action: "clicked" },
        split: { event: "support_channel", levels: ["channel"] },
      },
    ]),
    countBy(events, current, "support_open", ["entry"]),
    countBy(events, current, "support_prompt", ["prompt", "action"]),
    loadBreakdown(events, current, "support_channel", ["channel", "action"]),
    loadBreakdown(events, current, "support_channel", ["device", "channel"]),
    countBy(events, current, "support_open", ["locale"]),
    countBy(events, current, "support_channel", ["locale"], { where: { action: "clicked" } }),
  ]);

  const openedBy = new Map(opened.map((row) => [String(row.entry ?? ""), row.n]));
  const promptCount = (prompt: string, action: string) =>
    prompts.find((row) => row.prompt === prompt && row.action === action)?.n ?? 0;
  const entryRows = SUPPORT_ENTRIES.map((entry) => {
    const prompted = PROMPTED.has(entry);
    const shown = prompted ? promptCount(entry, "shown") : null;
    const dialogOpens = openedBy.get(entry) ?? 0;
    return {
      entry: valueLabel("support_open", "entry", entry),
      shown: shown ?? "–",
      opens: dialogOpens,
      rate: shown ? pct(promptCount(entry, "opened"), shown) : "–",
      dismissed: prompted ? promptCount(entry, "dismissed") : "–",
    };
  });

  const locales = new Map<string, { locale: string; opens: number; clicks: number }>();
  for (const [counted, field] of [
    [openedByLocale, "opens"],
    [clickedByLocale, "clicks"],
  ] as const) {
    for (const row of counted) {
      const locale = String(row.locale ?? "Not recorded");
      const entry = locales.get(locale) ?? { locale, opens: 0, clicks: 0 };
      entry[field] += row.n;
      locales.set(locale, entry);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card
        title="Support funnel"
        subtitle="Unique visitors · each step keeps only visitors from the step above"
        className="lg:col-span-2"
        info={
          <div className="grid gap-4 md:grid-cols-2">
            <EventDefinitions title="Opened the dialog · split by what first opened it" event="support_open" fields={["entry"]} />
            <EventDefinitions title="Clicked through · split by their first channel" event="support_channel" fields={["channel", "action"]} />
          </div>
        }
      >
        <Funnel steps={funnel} unit="Unique visitors" nested previous={null} />
        <p className="mt-3 text-xs text-zinc-500">
          Clicking through is pressing Ko-fi&apos;s button, or saving or enlarging the WeChat code. Visitors who click on the About
          page without opening the dialog are not in this funnel; the Channels card counts them. Scanning a code from another
          screen is not visible to the site, so WeChat tips are undercounted.
        </p>
      </Card>
      <Card
        title="Entries"
        subtitle="Where the dialog was opened, and how the prompts that appear on their own fare"
        className="lg:col-span-2"
        info={
          <div className="space-y-2">
            <EventDefinitions event="support_open" fields={["entry"]} />
            <EventDefinitions event="support_prompt" fields={["prompt", "action"]} />
            <p>
              Only the three prompts that appear on their own have a Shown count. For the menu, the page-end line and the Iris
              limit card, compare Opened with the page views of that place.
            </p>
          </div>
        }
      >
        <Table
          rows={entryRows}
          columns={[
            { key: "entry", label: "Entry" },
            { key: "shown", label: "Shown", align: "right", widthClass: COUNT_WIDTH },
            { key: "opens", label: "Dialog opens", align: "right", widthClass: "w-28" },
            { key: "rate", label: "Opened %", align: "right", widthClass: "w-24" },
            { key: "dismissed", label: "Dismissed", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card
        title="Channels"
        subtitle="Switches to the other tab and clicks, by channel"
        info={<EventDefinitions event="support_channel" fields={["channel", "action"]} />}
      >
        <BreakdownTree nodes={channels} unit="Actions" />
      </Card>
      <Card
        title="Devices"
        subtitle="By how a WeChat code can be used on the device, then by channel"
        info={<EventDefinitions event="support_channel" fields={["device"]} />}
      >
        <BreakdownTree nodes={devices} unit="Actions" />
      </Card>
      <Card
        title="Language"
        subtitle="Dialog opens and click-throughs, by the page's language"
        className="lg:col-span-2"
        info={<p>Click-throughs are the same as in the funnel, counted in events rather than visitors.</p>}
      >
        <Table
          rows={[...locales.values()].map((row) => ({ ...row, rate: pct(row.clicks, row.opens) }))}
          columns={[
            { key: "locale", label: "Language" },
            { key: "opens", label: "Dialog opens", align: "right", widthClass: "w-28" },
            { key: "clicks", label: "Click-throughs", align: "right", widthClass: "w-32" },
            { key: "rate", label: "Clicked %", align: "right", widthClass: "w-24" },
          ]}
        />
      </Card>
    </main>
  );
}
