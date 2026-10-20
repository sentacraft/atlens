import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteD1 } from "@/lib/__tests__/support/sqlite-d1";

vi.mock("server-only", () => ({}));

const {
  countBy,
  dashboardWindows,
  dayOf,
  loadAccounts,
  loadDaily,
  loadFirstEventTs,
  loadBreakdown,
  loadConversationsPerVisitor,
  loadIris,
  loadIrisFunnel,
  loadSearchFunnel,
  loadSessionFunnel,
  loadSignInFunnel,
  loadIrisFeedback,
  loadOverview,
  loadSignedInShare,
  rangeWindows,
} = await import("../dashboard");

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
// 2026-10-10 00:00 in China time.
const T0 = Date.parse("2026-10-09T16:00:00Z");
const WINDOW = { from: T0, to: T0 + 3 * DAY };

let analytics: ReturnType<typeof createSqliteD1>;

type Seed = {
  ts: number;
  event: string;
  vid?: string | null;
  props?: object;
  internal?: number;
  signedIn?: number;
  weight?: number;
  origin?: string;
  path?: string;
};

function seed(events: Seed[]) {
  const insert = analytics.sqlite.prepare(
    "INSERT INTO events (ts, event, vid, path, signed_in, internal, weight, origin, props) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const e of events) {
    insert.run(
      e.ts,
      e.event,
      e.vid === undefined ? "v1" : e.vid,
      e.path ?? null,
      e.signedIn ?? 0,
      e.internal ?? 0,
      e.weight ?? 1,
      e.origin ?? "live",
      JSON.stringify(e.props ?? {}),
    );
  }
}

beforeEach(() => {
  analytics = createSqliteD1("migrations/analytics");
});

describe("rangeWindows", () => {
  it("compares a range with the same length right before it", () => {
    expect(rangeWindows("7d", 10 * DAY)).toEqual({
      current: { from: 3 * DAY, to: 10 * DAY },
      previous: { from: -4 * DAY, to: 3 * DAY },
    });
    expect(rangeWindows("all", 10 * DAY)).toEqual({ current: { from: 0, to: 10 * DAY }, previous: null });
  });

  it("counts days in China time", () => {
    expect(dayOf(Date.parse("2026-10-09T16:30:00Z"))).toBe("2026-10-10");
  });
});

describe("loadOverview", () => {
  it("splits a visitor's events into sessions at 30-minute gaps and skips internal traffic", async () => {
    seed([
      { ts: T0, event: "lens_view" },
      { ts: T0 + 20 * MIN, event: "lens_view" },
      { ts: T0 + 60 * MIN, event: "search", props: { query: "xf", results_count: 0 } },
      { ts: T0, event: "lens_view", vid: "v2", weight: 2 },
      { ts: T0, event: "lens_view", vid: "v3", internal: 1 },
      { ts: T0 + 5 * DAY, event: "lens_view" },
    ]);

    expect(await loadOverview(analytics.d1, WINDOW)).toEqual({
      visitors: 2,
      sessions: 3,
      lensViews: 4,
      searches: 1,
      zeroResultSearches: 1,
      purchaseClicks: 0,
      irisTurns: 0,
    });
  });
});

describe("loadDaily", () => {
  it("returns every day of the window, quiet days as zeros", async () => {
    seed([
      { ts: T0 + MIN, event: "lens_view" },
      { ts: T0 + 2 * DAY + MIN, event: "purchase_click" },
    ]);

    const days = await loadDaily(analytics.d1, WINDOW);

    expect(days.map((d) => [d.day, d.sessions, d.lensViews, d.purchaseClicks])).toEqual([
      ["2026-10-10", 1, 1, 0],
      ["2026-10-11", 0, 0, 0],
      ["2026-10-12", 1, 0, 1],
    ]);
  });
});

describe("loadSessionFunnel", () => {
  it("counts the sessions that reached each step", async () => {
    seed([
      { ts: T0, event: "search" },
      { ts: T0 + MIN, event: "lens_view" },
      { ts: T0 + 2 * MIN, event: "compare_view" },
      { ts: T0 + 3 * MIN, event: "purchase_click" },
      { ts: T0, event: "lens_view", vid: "v2" },
    ]);

    expect((await loadSessionFunnel(analytics.d1, WINDOW)).map((step) => [step.label, step.count])).toEqual([
      ["All sessions", 2],
      ["Searched or filtered", 1],
      ["Viewed a lens", 2],
      ["Opened a comparison", 1],
      ["Clicked through to a store", 1],
    ]);
  });
});

describe("countBy", () => {
  it("groups by props and columns, filtered and weighted", async () => {
    seed([
      { ts: T0, event: "search", props: { query: "xf", results_count: 0 }, weight: 2 },
      { ts: T0, event: "search", props: { query: "xf", results_count: 0 } },
      { ts: T0, event: "search", props: { query: "56", results_count: 3 } },
      { ts: T0, event: "share_action", path: "/zh", props: { method: "native" } },
    ]);

    expect(await countBy(analytics.d1, WINDOW, "search", ["query"], { where: { results_count: 0 } })).toEqual([
      { query: "xf", n: 3 },
    ]);
    expect(await countBy(analytics.d1, WINDOW, "share_action", ["path", "method"])).toEqual([
      { path: "/zh", method: "native", n: 1 },
    ]);
  });

  it("rejects a key that is not a plain identifier", async () => {
    await expect(countBy(analytics.d1, WINDOW, "search", ["query') --"])).rejects.toThrow("invalid group key");
  });
});

describe("loadIris", () => {
  it("sums turns and reads per-conversation context", async () => {
    const turn = (conversation: string, steps: number, context: number, budgetHit = false) => ({
      ts: T0,
      event: "askiris_turn",
      props: {
        mount: "X",
        conversation_id: conversation,
        total_tokens: 100,
        input_tokens: 80,
        output_tokens: 20,
        cache_read_tokens: 40,
        step_count: steps,
        budget_hit: budgetHit,
        max_context_tokens: context,
      },
    });
    seed([
      turn("c1", 2, 300),
      turn("c1", 3, 500),
      turn("c2", 8, 900, true),
      { ts: T0, event: "askiris_view" },
      { ts: T0, event: "askiris_view", vid: "v2" },
      { ts: T0, event: "askiris_rec_click" },
    ]);

    expect(await loadIris(analytics.d1, WINDOW)).toMatchObject({
      turns: 3,
      conversations: 2,
      totalTokens: 300,
      inputTokens: 240,
      cacheReadTokens: 120,
      steps: 13,
      budgetHits: 1,
      viewers: 2,
      askers: 1,
      recClicks: 1,
      contextP50: 900,
      contextMax: 900,
      stepsHistogram: [
        { steps: 2, turns: 1 },
        { steps: 3, turns: 1 },
        { steps: 8, turns: 1 },
      ],
      byMount: [{ mount: "X", turns: 3, tokens: 300 }],
    });
  });
});

describe("loadSignedInShare", () => {
  it("counts live sessions with a signed-in event", async () => {
    seed([
      { ts: T0, event: "lens_view", signedIn: 1 },
      { ts: T0 + MIN, event: "lens_view" },
      { ts: T0, event: "lens_view", vid: "v2" },
      { ts: T0, event: "lens_view", vid: "v3", origin: "ae_import" },
    ]);

    expect(await loadSignedInShare(analytics.d1, WINDOW)).toEqual({ sessions: 2, signedIn: 1 });
  });
});

describe("loadIrisFeedback", () => {
  it("counts ratings submitted in the window", async () => {
    const traces = createSqliteD1("migrations/askiris-internal");
    const insert = traces.sqlite.prepare(
      "INSERT INTO askiris_response_feedback (feedback_id, turn_id, response_message_id, rating, created_at, updated_at) VALUES (?, 't', ?, ?, ?, ?)",
    );
    insert.run("f1", "m1", "helpful", T0, T0);
    insert.run("f2", "m2", "unhelpful", T0 + DAY, T0 + DAY);
    insert.run("f3", "m3", "helpful", T0 + 5 * DAY, T0 + 5 * DAY);

    expect(await loadIrisFeedback(traces.d1, WINDOW)).toEqual({ helpful: 1, unhelpful: 1 });
  });
});

describe("loadAccounts", () => {
  it("counts new accounts, not guests, and saves made in the window", async () => {
    const app = createSqliteD1("migrations/app");
    const user = app.sqlite.prepare(
      "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, isAnonymous) VALUES (?, ?, ?, 1, ?, ?, ?)",
    );
    const iso = (ts: number) => new Date(ts).toISOString();
    user.run("u1", "A", "a@test", iso(T0 + MIN), iso(T0), 0);
    user.run("u2", "B", "b@test", iso(T0 - 5 * DAY), iso(T0), 0);
    user.run("g1", "G", "g@test", iso(T0 + MIN), iso(T0), 1);
    app.sqlite
      .prepare("INSERT INTO user_favorites (user_id, lens_id, created_at) VALUES ('u1', 'xf-33', ?)")
      .run(T0 + MIN);

    const accounts = await loadAccounts(app.d1, WINDOW);
    expect(accounts.newBySignUp.map((node) => [node.label, node.count])).toEqual([["Email code", 1]]);
    expect(accounts.allBySignUp.map((node) => [node.label, node.count])).toEqual([["Email code", 2]]);
    expect(accounts).toMatchObject({ favoritesAdded: 1, gearAdded: 0 });
  });

  it("tells Google sign-ups from email-code accounts that linked Google later", async () => {
    const app = createSqliteD1("migrations/app");
    const iso = (ts: number) => new Date(ts).toISOString();
    const user = app.sqlite.prepare(
      "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
    );
    const google = app.sqlite.prepare(
      "INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt) VALUES (?, ?, 'google', ?, ?, ?)",
    );
    user.run("g", "G", "g@test", iso(T0 + MIN), iso(T0 + MIN));
    google.run("a1", "1", "g", iso(T0 + MIN + 500), iso(T0 + MIN + 500));
    user.run("e", "E", "e@test", iso(T0 + 2 * MIN), iso(T0 + 2 * MIN));
    user.run("l", "L", "l@test", iso(T0 - 5 * DAY), iso(T0 - 5 * DAY));
    google.run("a2", "2", "l", iso(T0 + DAY), iso(T0 + DAY));

    const { newBySignUp, allBySignUp } = await loadAccounts(app.d1, WINDOW);
    expect(newBySignUp.map((node) => [node.label, node.count, node.children.length]).sort()).toEqual([
      ["Email code", 1, 0],
      ["Google", 1, 0],
    ]);
    const email = allBySignUp.find((node) => node.label === "Email code");
    expect(email?.count).toBe(2);
    expect(email?.children.map((node) => [node.label, node.count])).toEqual([
      ["Later linked Google", 1],
      ["Email only", 1],
    ]);
  });
});

describe("loadIrisFunnel", () => {
  it("keeps each step a subset of the one above and splits it by each visitor's first event", async () => {
    seed([
      { ts: T0, event: "page_view", vid: "a" },
      { ts: T0, event: "askiris_open", vid: "b", props: { entry: "home", surface: "page", pool: "need" } },
      { ts: T0 + 1, event: "askiris_view", vid: "b" },
      { ts: T0 + 2, event: "askiris_message", vid: "b", props: { method: "starter", pool: "need" } },
      { ts: T0 + 3, event: "askiris_turn", vid: "b" },
      { ts: T0 + 4, event: "askiris_rec_click", vid: "b", props: { source: "askiris" } },
      { ts: T0 + 5, event: "askiris_open", vid: "b", props: { entry: "nav", surface: "panel" } },
      { ts: T0, event: "askiris_open", vid: "c", props: { entry: "lens", surface: "panel" } },
      { ts: T0 + 1, event: "askiris_view", vid: "c" },
      { ts: T0, event: "askiris_view", vid: "d" },
      { ts: T0, event: "askiris_rec_click", vid: "e", props: { source: "askiris" } },
    ]);

    const [all, opened, asked, clicked] = await loadIrisFunnel(analytics.d1, WINDOW);
    expect([all.count, opened.count, asked.count, clicked.count]).toEqual([5, 3, 1, 1]);
    expect(opened.breakdown.map((node) => [node.label, node.count])).toEqual([
      ["Home", 1],
      ["Lens page", 1],
      ["Ask Iris page directly", 1],
    ]);
    expect(opened.breakdown[0].children.map((node) => node.label)).toEqual(["Find a lens"]);
    expect(asked.breakdown[0]).toMatchObject({ label: "Example question", count: 1 });
    expect(clicked.breakdown.map((node) => node.label)).toEqual(["Card"]);
  });
});

describe("loadConversationsPerVisitor", () => {
  it("counts each asking visitor's conversations, grouping four and more", async () => {
    const turn = (vid: string, conversation: string) => ({
      ts: T0,
      event: "askiris_turn",
      vid,
      props: { conversation_id: conversation },
    });
    seed([
      turn("a", "a1"),
      turn("a", "a1"),
      turn("b", "b1"),
      turn("b", "b2"),
      ...["c1", "c2", "c3", "c4", "c5"].map((conversation) => turn("c", conversation)),
      { ts: T0, event: "askiris_view", vid: "d" },
    ]);

    const result = await loadConversationsPerVisitor(analytics.d1, WINDOW);
    expect(result).toMatchObject({ askers: 3, conversations: 8, returning: 2 });
    expect(result.distribution.map((node) => [node.label, node.count])).toEqual([
      ["1 conversation", 1],
      ["2 conversations", 1],
      ["4 or more", 1],
    ]);
  });
});

describe("loadSignInFunnel", () => {
  it("counts visitors who opened sign-in, then sent it", async () => {
    seed([
      { ts: T0, event: "sign_in_open", vid: "a", props: { reason: "favorite" } },
      { ts: T0 + 1, event: "sign_in_submit", vid: "a", props: { method: "google" } },
      { ts: T0, event: "sign_in_open", vid: "b", props: { reason: "general" } },
      { ts: T0 + 1, event: "sign_in_open", vid: "b", props: { reason: "favorite" } },
    ]);

    const [opened, sent] = await loadSignInFunnel(analytics.d1, WINDOW);
    expect(opened.breakdown.map((node) => [node.label, node.count])).toEqual([
      ["Favorite", 1],
      ["General", 1],
    ]);
    expect(sent).toMatchObject({ count: 1, breakdown: [{ label: "Google", count: 1 }] });
  });
});

describe("loadSearchFunnel", () => {
  it("counts searches, those with results and picks by position", async () => {
    seed([
      { ts: T0, event: "search", props: { query: "xf", results_count: 0 } },
      { ts: T0, event: "search", props: { query: "56", results_count: 3 }, weight: 2 },
      { ts: T0, event: "search_select", props: { rank: 1 } },
    ]);

    const steps = await loadSearchFunnel(analytics.d1, WINDOW);
    expect(steps.map((step) => step.count)).toEqual([3, 2, 1]);
    expect(steps[2].breakdown).toMatchObject([{ label: "Position 1", count: 1 }]);
  });
});

describe("loadBreakdown", () => {
  it("nests weighted counts and names values from the event docs", async () => {
    seed([
      { ts: T0, event: "purchase_click", props: { channel: "amazon", is_affiliate: true }, weight: 3 },
      { ts: T0, event: "purchase_click", props: { channel: "amazon", is_affiliate: false } },
      { ts: T0, event: "purchase_click", props: { channel: "ebay" } },
    ]);

    const nodes = await loadBreakdown(analytics.d1, WINDOW, "purchase_click", ["channel", "is_affiliate"]);
    expect(nodes.map((node) => [node.label, node.count])).toEqual([
      ["Amazon", 4],
      ["eBay", 1],
    ]);
    expect(nodes[0].children.map((node) => [node.value, node.count])).toEqual([
      ["1", 3],
      ["0", 1],
    ]);
    expect(nodes[1].children).toEqual([]);
  });
});

describe("loadFirstEventTs", () => {
  it("is the earliest event, or null without events", async () => {
    expect(await loadFirstEventTs(analytics.d1)).toBeNull();
    seed([{ ts: T0 + DAY, event: "lens_view" }, { ts: T0, event: "search" }]);
    expect(await loadFirstEventTs(analytics.d1)).toBe(T0);
    expect(await loadFirstEventTs(analytics.d1, "lens_view")).toBe(T0 + DAY);
    expect(await loadFirstEventTs(analytics.d1, "search_select")).toBeNull();
  });
});

describe("dashboardWindows", () => {
  it("drops the comparison when it would start before the first event", async () => {
    seed([{ ts: T0, event: "lens_view" }]);

    expect((await dashboardWindows(analytics.d1, "7d", T0 + 20 * DAY)).previous).toEqual({ from: T0 + 6 * DAY, to: T0 + 13 * DAY });
    expect((await dashboardWindows(analytics.d1, "7d", T0 + 10 * DAY)).previous).toBeNull();
  });
});
