import { getCloudflareContext } from "@opennextjs/cloudflare";
import { COUNT_WIDTH, Card, D1_CUTOVER_DAY, Facts, Table, fmtNum, pct } from "@/components/admin/AnalyticsUi";
import { countBy, dashboardWindows, loadAccounts, loadSignedInShare } from "@/lib/analytics/dashboard";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const { env } = getCloudflareContext();
  const events = env.ANALYTICS_DB;
  const { current } = await dashboardWindows(events, range);

  const [accounts, signedIn, feedbackOpens, feedbackSubmits, pwaLaunches, installs, mountSwitches, locales, signInOpens, signInSubmits] = await Promise.all([
    loadAccounts(env.APP_DB, current),
    loadSignedInShare(events, current),
    countBy(events, current, "feedback_open", ["feedback_type"]),
    countBy(events, current, "feedback_submit", ["feedback_type"]),
    countBy(events, current, "pwa_launch", ["source"]),
    countBy(events, current, "install_action", []),
    countBy(events, current, "mount_switch", ["from_mount", "to_mount"]),
    countBy(events, current, null, ["locale"]),
    countBy(events, current, "sign_in_open", ["reason"]),
    countBy(events, current, "sign_in_submit", ["method"]),
  ]);

  const feedbackTypes = new Map<string, { feedback_type: string; opens: number; submits: number }>();
  for (const [rows, field] of [
    [feedbackOpens, "opens"],
    [feedbackSubmits, "submits"],
  ] as const) {
    for (const row of rows) {
      const type = String(row.feedback_type ?? "");
      const entry = feedbackTypes.get(type) ?? { feedback_type: type, opens: 0, submits: 0 };
      entry[field] += row.n;
      feedbackTypes.set(type, entry);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card title="Sign-ups and saves">
        <Facts
          items={[
            ["New accounts", fmtNum(accounts.newAccounts)],
            ["Accounts in total", fmtNum(accounts.totalAccounts)],
            ["Favorites added", fmtNum(accounts.favoritesAdded)],
            ["Gear added", fmtNum(accounts.gearAdded)],
          ]}
        />
      </Card>
      <Card title="Sign-in · dialog opens and submits">
        <Table
          rows={[
            ...signInOpens.map((r) => ({ what: `Opened · ${r.reason ?? ""}`, n: r.n })),
            ...signInSubmits.map((r) => ({ what: `Submitted · ${r.method ?? ""}`, n: r.n })),
          ]}
          columns={[{ key: "what", label: "Step" }, { key: "n", label: "Count", align: "right", widthClass: COUNT_WIDTH }]}
        />
        <p className="mt-2 text-xs text-zinc-400">New accounts in the card beside count the sign-ups that went through.</p>
      </Card>
      <Card title={`Signed-in sessions (since ${D1_CUTOVER_DAY})`}>
        <Facts
          items={[
            ["Sessions", fmtNum(signedIn.sessions)],
            ["With an account signed in", fmtNum(signedIn.signedIn)],
            ["Share", pct(signedIn.signedIn, signedIn.sessions)],
          ]}
        />
      </Card>
      <Card title="Feedback · opens and submits">
        <Table
          rows={[...feedbackTypes.values()]}
          columns={[
            { key: "feedback_type", label: "Type" },
            { key: "opens", label: "Opens", align: "right", widthClass: COUNT_WIDTH },
            { key: "submits", label: "Submits", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card title="App · launches and installs">
        <Facts items={[["Accepted install prompts", fmtNum(installs[0]?.n ?? 0)]]} />
        <div className="mt-3">
          <Table rows={pwaLaunches} columns={[{ key: "source", label: "Launched from" }, { key: "n", label: "Launches", align: "right", widthClass: COUNT_WIDTH }]} />
        </div>
      </Card>
      <Card title="Mount switches">
        <Table
          rows={mountSwitches}
          columns={[
            { key: "from_mount", label: "From" },
            { key: "to_mount", label: "To" },
            { key: "n", label: "Switches", align: "right", widthClass: COUNT_WIDTH },
          ]}
        />
      </Card>
      <Card title="Language">
        <Table rows={locales.map((r) => ({ ...r, locale: r.locale || "(unknown)" }))} columns={[{ key: "locale", label: "Locale" }, { key: "n", label: "Events", align: "right", widthClass: COUNT_WIDTH }]} />
      </Card>
    </main>
  );
}
