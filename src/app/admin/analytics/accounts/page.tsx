import { getCloudflareContext } from "@opennextjs/cloudflare";
import Card from "@/components/admin/AnalyticsCard";
import { COUNT_WIDTH, D1_CUTOVER_DAY, Definitions, EventDefinitions, Facts, Table, fmtNum, pct } from "@/components/admin/AnalyticsUi";
import { BreakdownTree, Funnel } from "@/components/admin/Breakdown";
import { groupNode } from "@/lib/analytics/breakdown";
import {
  countBy,
  dashboardWindows,
  eventLabels,
  loadAccounts,
  loadBreakdown,
  loadLocales,
  loadSignInFunnel,
  loadSignedInShare,
} from "@/lib/analytics/dashboard";
import { valueLabel } from "@/lib/analytics/events";
import { resolveAnalyticsRange } from "@/lib/url/admin-analytics";

export const dynamic = "force-dynamic";

const SWITCH_LABELS = eventLabels("mount_switch");

export default async function AnalyticsAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = resolveAnalyticsRange(await searchParams);
  const { env } = getCloudflareContext();
  const events = env.ANALYTICS_DB;
  const { current } = await dashboardWindows(events, range);

  const [accounts, signedIn, signIn, feedbackOpens, feedbackSubmits, launches, installs, mountSwitches, locales] = await Promise.all([
    loadAccounts(env.APP_DB, current),
    loadSignedInShare(events, current),
    loadSignInFunnel(events, current),
    countBy(events, current, "feedback_open", ["feedback_type"]),
    countBy(events, current, "feedback_submit", ["feedback_type"]),
    loadBreakdown(events, current, "pwa_launch", ["source"]),
    countBy(events, current, "install_action", []),
    loadBreakdown(events, current, "mount_switch", ["from_mount", "to_mount"], (level, value) =>
      `${level === "from_mount" ? "From" : "To"} ${SWITCH_LABELS(level, value)}`,
    ),
    loadLocales(events, current),
  ]);

  const feedbackTypes = new Map<string, { type: string; opens: number; submits: number }>();
  for (const [counted, field] of [
    [feedbackOpens, "opens"],
    [feedbackSubmits, "submits"],
  ] as const) {
    for (const row of counted) {
      const type = valueLabel("feedback_open", "feedback_type", String(row.feedback_type ?? ""));
      const entry = feedbackTypes.get(type) ?? { type, opens: 0, submits: 0 };
      entry[field] += row.n;
      feedbackTypes.set(type, entry);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <Card
        title="Sign-in funnel"
        subtitle="Unique visitors · each step keeps only visitors from the step above"
        className="lg:col-span-2"
        info={
          <div className="grid gap-4 md:grid-cols-2">
            <EventDefinitions title="Opened sign-in · split by what first opened it" event="sign_in_open" fields={["reason"]} />
            <EventDefinitions title="Sent sign-in · split by their first method" event="sign_in_submit" fields={["method"]} />
          </div>
        }
      >
        <Funnel steps={signIn} unit="Unique visitors" nested previous={null} />
      </Card>
      <Card
        title="Accounts by sign-up method"
        subtitle="From the account database, history included"
        info={
          <div className="space-y-2">
            <p>
              One email address is one account: Google and an email code both sign in to it, whichever came first. Guest
              Iris users are not accounts.
            </p>
            <Definitions
              items={[
                { term: "Google", description: "Created by a Google sign-in" },
                { term: "Email code", description: "Created by an email code" },
                { term: "Later linked Google", description: "Created by an email code, then signed in with Google using the same address" },
              ]}
            />
          </div>
        }
      >
        <div className="space-y-4">
          <BreakdownTree nodes={[groupNode("New in this range", accounts.newBySignUp)]} unit="Accounts" />
          <BreakdownTree nodes={[groupNode("All accounts", accounts.allBySignUp)]} unit="Accounts" />
        </div>
      </Card>
      <Card
        title="Signed-in sessions and saves"
        subtitle={`Sessions since ${D1_CUTOVER_DAY}`}
        info={
          <Definitions
            items={[
              { term: "Signed-in session", description: "A session with at least one event sent while an account was signed in" },
              { term: "Before the cutover", description: `Events imported from before ${D1_CUTOVER_DAY} carry no sign-in data and are left out` },
              { term: "Favorites, gear", description: "Lenses saved to favorites and to gear in this range, from the account database" },
            ]}
          />
        }
      >
        <Facts
          items={[
            ["Signed in", `${fmtNum(signedIn.signedIn)} of ${fmtNum(signedIn.sessions)} sessions · ${pct(signedIn.signedIn, signedIn.sessions)}`],
            ["Favorites added", `${fmtNum(accounts.favoritesAdded)} lenses`],
            ["Gear added", `${fmtNum(accounts.gearAdded)} lenses`],
          ]}
        />
      </Card>
      <Card
        title="Feedback"
        subtitle="Forms opened, then sent"
        info={<EventDefinitions event="feedback_open" fields={["feedback_type"]} />}
      >
        <Table
          rows={[...feedbackTypes.values()].map((row) => ({ ...row, rate: pct(row.submits, row.opens) }))}
          columns={[
            { key: "type", label: "Form" },
            { key: "opens", label: "Opened", align: "right", widthClass: COUNT_WIDTH },
            { key: "submits", label: "Sent", align: "right", widthClass: COUNT_WIDTH },
            { key: "rate", label: "Sent %", align: "right", widthClass: "w-16" },
          ]}
        />
      </Card>
      <Card
        title="App · launches and installs"
        subtitle="The installed web app"
        info={
          <div className="space-y-2">
            <EventDefinitions event="install_action" />
            <EventDefinitions event="pwa_launch" fields={["source"]} />
          </div>
        }
      >
        <Facts items={[["Install prompts accepted", `${fmtNum(installs[0]?.n ?? 0)} times`]]} />
        <div className="mt-4">
          <BreakdownTree nodes={launches} unit="Launches" />
        </div>
      </Card>
      <Card title="Mount switches" subtitle="From one catalog, to the other" info={<EventDefinitions event="mount_switch" fields={["from_mount"]} />}>
        <BreakdownTree nodes={mountSwitches} unit="Switches" />
      </Card>
      <Card
        title="Language"
        subtitle="Events by the page's language"
        info={<p>Every event records the language of the page it came from. Events without one are counted as not recorded.</p>}
      >
        <BreakdownTree nodes={locales} unit="Events" />
      </Card>
    </main>
  );
}
