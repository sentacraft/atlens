import { getCloudflareContext } from "@opennextjs/cloudflare";
import { COUNT_WIDTH, Card, Table } from "@/components/admin/AnalyticsUi";
import { countBy, dashboardWindows } from "@/lib/analytics/dashboard";
import { formatHref, formatLensSlug, formatShareMethod } from "@/lib/analytics/format";
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

  const [purchaseByChannel, purchaseByLens, outbound, outboundBySource, share, shareBySource] = await Promise.all([
    countBy(events, current, "purchase_click", ["channel", "is_affiliate"], { limit: 100 }),
    countBy(events, current, "purchase_click", ["lens_id"]),
    countBy(events, current, "outbound_click", ["href"]),
    countBy(events, current, "outbound_click", ["path", "href"], { limit: 30 }),
    countBy(events, current, "share_action", ["method"]),
    countBy(events, current, "share_action", ["path", "method"], { limit: 30 }),
  ]);

  const channels = new Map<string, { channel: string; clicks: number; affiliate: number }>();
  for (const row of purchaseByChannel) {
    const channel = String(row.channel ?? "");
    const entry = channels.get(channel) ?? { channel, clicks: 0, affiliate: 0 };
    entry.clicks += row.n;
    if (row.is_affiliate) {
      entry.affiliate += row.n;
    }
    channels.set(channel, entry);
  }

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card title="Store clicks · by channel">
        <Table
          rows={[...channels.values()].sort((a, b) => b.clicks - a.clicks)}
          columns={[
            { key: "channel", label: "Channel" },
            { key: "clicks", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
            { key: "affiliate", label: "Affiliate", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card title="Store clicks · top lenses">
        <Table
          rows={purchaseByLens.map((r) => ({ ...r, display: formatLensSlug(String(r.lens_id ?? "")) }))}
          columns={[{ key: "display", label: "Lens", titleKey: "lens_id" }, { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Outbound · destinations">
        <Table
          rows={outbound.map((r) => ({ ...r, display: formatHref(String(r.href ?? "")) }))}
          columns={[{ key: "display", label: "Destination", titleKey: "href" }, { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Outbound · by source page">
        <Table
          rows={outboundBySource.map((r) => ({ ...r, display: formatHref(String(r.href ?? "")) }))}
          columns={[
            { key: "path", label: "Source page" },
            { key: "display", label: "Destination", titleKey: "href" },
            { key: "n", label: "Clicks", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card title="Share · by method">
        <Table
          rows={share.map((r) => ({ ...r, display: formatShareMethod(String(r.method ?? "")) }))}
          columns={[{ key: "display", label: "Method", titleKey: "method" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]}
        />
      </Card>
      <Card title="Share · by source page">
        <Table
          rows={shareBySource.map((r) => ({ ...r, display: formatShareMethod(String(r.method ?? "")) }))}
          columns={[
            { key: "path", label: "Source page" },
            { key: "display", label: "Method", titleKey: "method" },
            { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
    </main>
  );
}
