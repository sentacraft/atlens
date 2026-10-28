import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteD1 } from "@/lib/__tests__/support/sqlite-d1";

const state = vi.hoisted(() => ({
  db: null as unknown as D1Database,
  pending: [] as Promise<unknown>[],
  hasAccountSession: vi.fn(async () => false),
  limit: vi.fn(async () => ({ success: true })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-session", () => ({ hasAccountSession: state.hasAccountSession }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: { ANALYTICS_DB: state.db, RL_ANALYTICS: { limit: state.limit } },
    ctx: { waitUntil: (promise: Promise<unknown>) => state.pending.push(promise) },
  }),
}));

const { POST } = await import("../route");

let sqlite: ReturnType<typeof createSqliteD1>["sqlite"];

async function post(body: unknown, cookie?: string, ip?: string) {
  const headers = { ...(cookie ? { cookie } : {}), ...(ip ? { "cf-connecting-ip": ip } : {}) };
  const response = await POST(
    new NextRequest("http://localhost/api/track", { method: "POST", body: JSON.stringify(body), headers }),
  );
  await Promise.all(state.pending);
  return response;
}

function rows() {
  return sqlite.prepare("SELECT * FROM events").all() as Record<string, unknown>[];
}

const VID = "0f8fad5b-d9cb-469f-a165-70867728950e";

beforeEach(() => {
  const created = createSqliteD1("migrations/analytics");
  state.db = created.d1;
  state.pending = [];
  state.hasAccountSession.mockResolvedValue(false);
  state.limit.mockResolvedValue({ success: true });
  sqlite = created.sqlite;
});

describe("POST /api/track", () => {
  it("drops an event past the per-IP rate without writing it", async () => {
    state.limit.mockResolvedValue({ success: false });
    const response = await post({ event: "search", locale: "en", props: { query: "56mm", results_count: 3 } }, undefined, "203.0.113.1");

    expect(response.status).toBe(429);
    expect(rows()).toHaveLength(0);
  });

  it("stores a known event and gives a new visitor a 30-day cookie", async () => {
    state.hasAccountSession.mockResolvedValue(true);
    const response = await post({
      event: "search",
      locale: "en",
      path: "/en/lenses/x/browse",
      props: { query: "56mm", results_count: 3 },
    });

    expect(response.status).toBe(204);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^atlens_vid=[0-9a-f-]{36};/);
    expect(cookie).toMatch(/Max-Age=2592000/);
    expect(rows()).toEqual([
      expect.objectContaining({
        event: "search",
        vid: cookie.slice("atlens_vid=".length, cookie.indexOf(";")),
        locale: "en",
        path: "/en/lenses/x/browse",
        signed_in: 1,
        internal: 0,
        weight: 1,
        origin: "live",
        props: JSON.stringify({ query: "56mm", results_count: 3 }),
      }),
    ]);
  });

  it("keeps a returning visitor's id without renewing the cookie", async () => {
    const response = await post({ event: "filter_reset" }, `atlens_vid=${VID}`);

    expect(response.headers.get("set-cookie")).toBeNull();
    expect(rows()[0]).toMatchObject({ event: "filter_reset", vid: VID, signed_in: 0 });
  });

  it("rejects an unknown event and a non-object props", async () => {
    expect((await post({ event: "made_up" })).status).toBe(400);
    expect((await post({ event: "search", props: "x" })).status).toBe(400);
    expect(rows()).toEqual([]);
  });

  it("drops malformed and undeclared props and truncates long strings", async () => {
    await post({
      event: "search",
      props: { query: "q".repeat(300), results_count: "3", lens_id: "xf-33" },
    });

    expect(JSON.parse(rows()[0].props as string)).toEqual({ query: "q".repeat(256) });
  });

  it("marks events from an internal browser", async () => {
    await post({ event: "askiris_view" }, `atlens_vid=${VID}; atlens_internal=1`);

    expect(rows()[0]).toMatchObject({ internal: 1 });
  });

  it("takes signed_in from the session, not from the request body", async () => {
    await post({ event: "askiris_view", signed_in: true });

    expect(rows()[0]).toMatchObject({ signed_in: 0 });
  });

  it("still stores the event when the session lookup fails", async () => {
    state.hasAccountSession.mockRejectedValue(new Error("db down"));
    await post({ event: "askiris_view" });

    expect(rows()[0]).toMatchObject({ event: "askiris_view", signed_in: 0 });
  });
});
