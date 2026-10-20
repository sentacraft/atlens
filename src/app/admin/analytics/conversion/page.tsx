import { getCloudflareContext } from "@opennextjs/cloudflare";
import Card from "@/components/admin/AnalyticsCard";
import { COUNT_WIDTH, EventDefinitions, Table } from "@/components/admin/AnalyticsUi";
import { BreakdownTree } from "@/components/admin/Breakdown";
import { countBy, dashboardWindows, loadBreakdown } from "@/lib/analytics/dashboard";
import { valueLabel } from "@/lib/analytics/events";
import { formatHref, formatLensSlug } from "@/lib/analytics/format";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsConversionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const events = getCloudflareContext().env.ANALYTICS_DB;
  const { current } = await dashboardWindows(events, range);

  const [byStore, byPlace, purchaseByLens, outbound, outboundBySource, share, shareBySource] = await Promise.all([
    loadBreakdown(events, current, "purchase_click", ["channel", "is_affiliate"]),
    loadBreakdown(events, current, "purchase_click", ["source", "channel"]),
    countBy(events, current, "purchase_click", ["lens_id"]),
    countBy(events, current, "outbound_click", ["href"]),
    countBy(events, current, "outbound_click", ["path", "href"], { limit: 30 }),
    loadBreakdown(events, current, "share_action", ["method"]),
    countBy(events, current, "share_action", ["path", "method"], { limit: 30 }),
  ]);

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card
        title="Store clicks · by store"
        subtitle="Store link clicks, by store, then by whether the link earns a commission"
        info={<EventDefinitions event="purchase_click" fields={["channel", "is_affiliate"]} />}
      >
        <BreakdownTree nodes={byStore} unit="Clicks" />
      </Card>
      <Card
        title="Store clicks · by place"
        subtitle="Store link clicks, by where the link was, then by store"
        info={<EventDefinitions event="purchase_click" fields={["source"]} />}
      >
        <BreakdownTree nodes={byPlace} unit="Clicks" />
      </Card>
      <Card title="Store clicks · top lenses" subtitle="Store link clicks, by lens" info={<EventDefinitions event="purchase_click" />}>
        <Table
          rows={purchaseByLens.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_id ?? "")) }))}
          columns={[{ key: "display", label: "Lens", titleKey: "lens_id" }, { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Share · by method" subtitle="Shares, by how they were sent" info={<EventDefinitions event="share_action" fields={["method"]} />}>
        <BreakdownTree nodes={share} unit="Shares" />
      </Card>
      <Card
        title="Share · by source page"
        subtitle="Shares, by the page shared and how; top 30 pairs"
        info={<EventDefinitions event="share_action" fields={["method"]} />}
      >
        <Table
          rows={shareBySource.map((r) => ({ ...r, display: valueLabel("share_action", "method", String(r.method ?? "")) }))}
          columns={[
            { key: "path", label: "Page" },
            { key: "display", label: "Method", titleKey: "method" },
            { key: "n", label: "Shares", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card title="Outbound · destinations" subtitle="Clicks on links leaving the site, by destination" info={<EventDefinitions event="outbound_click" />}>
        <Table
          rows={outbound.map((r) => ({ ...r, display: formatHref(String(r.href ?? "")) }))}
          columns={[{ key: "display", label: "Destination", titleKey: "href" }, { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card
        title="Outbound · by source page"
        subtitle="Clicks on links leaving the site, by page and destination; top 30 pairs"
        info={<EventDefinitions event="outbound_click" />}
      >
        <Table
          rows={outboundBySource.map((r) => ({ ...r, display: formatHref(String(r.href ?? "")) }))}
          columns={[
            { key: "path", label: "Page" },
            { key: "display", label: "Destination", titleKey: "href" },
            { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
    </main>
  );
}
