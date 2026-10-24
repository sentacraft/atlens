import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteD1 } from "@/lib/__tests__/support/sqlite-d1";

const mocks = vi.hoisted(() => ({ userId: undefined as string | undefined, db: undefined as unknown }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { APP_DB: mocks.db } }),
}));
vi.mock("@/lib/auth-session", () => ({
  getAccountUserId: async () => mocks.userId,
}));

const gearRoute = await import("../gear/route");
const gearItemRoute = await import("../gear/[gearId]/route");
const favoritesRoute = await import("../favorites/route");
const favoriteRoute = await import("../favorites/[lensId]/route");
const settingsRoute = await import("../settings/route");

const LENS_ID = "fujifilm-xf-56mmf12-r-wr-x";

function json(method: string, body: unknown) {
  return new Request("http://localhost/api/me", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const get = () => new Request("http://localhost/api/me");

beforeEach(() => {
  const { d1, sqlite } = createSqliteD1("migrations/app");
  sqlite.prepare("INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES ('u1', 'u1', 'u1@example.test', 0, 0)").run();
  mocks.db = d1;
  mocks.userId = "u1";
});

describe("/api/me without an account", () => {
  it("answers 401 on every route", async () => {
    mocks.userId = undefined;
    const params = { params: Promise.resolve({ gearId: "g", lensId: "l" }) };
    const responses = await Promise.all([
      gearRoute.GET(get()),
      gearRoute.POST(json("POST", { kind: "body", catalogId: "fujifilm-x-t5" })),
      gearItemRoute.DELETE(get(), params),
      favoritesRoute.GET(get()),
      favoritesRoute.POST(json("POST", { lensId: LENS_ID })),
      favoriteRoute.DELETE(get(), params),
      settingsRoute.GET(get()),
      settingsRoute.PATCH(json("PATCH", { defaultMount: "G" })),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(401));
  });
});

describe("/api/me/gear", () => {
  it("adds a catalog body with the name and mount taken from the catalog", async () => {
    const response = await gearRoute.POST(json("POST", { kind: "body", catalogId: "fujifilm-gfx100s-ii" }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      gear: { kind: "body", catalogId: "fujifilm-gfx100s-ii", name: "GFX100S II", brand: "fujifilm", mount: "G" },
    });
  });

  it("adds a catalog lens", async () => {
    const response = await gearRoute.POST(json("POST", { kind: "lens", catalogId: LENS_ID }));

    await expect(response.json()).resolves.toMatchObject({
      gear: { kind: "lens", catalogId: LENS_ID, name: "XF 56mm F1.2 R WR", brand: "fujifilm", mount: "X" },
    });
  });

  it("stores a manual lens under the catalog brand when the typed brand matches one", async () => {
    const response = await gearRoute.POST(
      json("POST", {
        kind: "lens",
        manual: { brand: "铭匠", model: "AF 27mm F2.8", mount: "X", focalMinMm: 27, focalMaxMm: 27 },
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      gear: { brand: "ttartisan", manual: { brand: "ttartisan" } },
    });
  });

  it("rejects unknown catalog ids and malformed bodies", async () => {
    const unknown = await gearRoute.POST(json("POST", { kind: "body", catalogId: "fujifilm-x100vi" }));
    const lensAsBody = await gearRoute.POST(json("POST", { kind: "body", catalogId: LENS_ID }));
    const malformed = await gearRoute.POST(new Request("http://localhost", { method: "POST", body: "nope" }));

    expect([unknown.status, lensAsBody.status, malformed.status]).toEqual([400, 400, 400]);
    await expect(unknown.json()).resolves.toEqual({ error: "unknown_catalog_id" });
  });

  it("lists and deletes the user's gear", async () => {
    const added = await gearRoute.POST(json("POST", { kind: "body", catalogId: "fujifilm-x-t5" }));
    const { gear } = (await added.json()) as { gear: { id: string } };

    const listed = await gearRoute.GET(get());
    await expect(listed.json()).resolves.toMatchObject({ gear: [{ id: gear.id }] });

    const deleted = await gearItemRoute.DELETE(get(), { params: Promise.resolve({ gearId: gear.id }) });
    const again = await gearItemRoute.DELETE(get(), { params: Promise.resolve({ gearId: gear.id }) });
    expect([deleted.status, again.status]).toEqual([204, 404]);
  });
});

describe("/api/me/favorites", () => {
  it("adds, lists and removes a favorite", async () => {
    expect((await favoritesRoute.POST(json("POST", { lensId: LENS_ID }))).status).toBe(204);
    await expect((await favoritesRoute.GET(get())).json()).resolves.toMatchObject({
      favorites: [{ lensId: LENS_ID }],
    });

    await favoriteRoute.DELETE(get(), { params: Promise.resolve({ lensId: LENS_ID }) });
    await expect((await favoritesRoute.GET(get())).json()).resolves.toEqual({ favorites: [] });
  });

  it("rejects a lens that is not in the catalog", async () => {
    const response = await favoritesRoute.POST(json("POST", { lensId: "made-up" }));

    expect(response.status).toBe(400);
  });
});

describe("/api/me/settings", () => {
  it("returns defaults, then the patched settings", async () => {
    await expect((await settingsRoute.GET(get())).json()).resolves.toEqual({
      settings: { defaultMount: "X", locale: null, supportPromptRespondedAt: null },
    });

    const patched = await settingsRoute.PATCH(json("PATCH", { defaultMount: "G", locale: "zh" }));
    await expect(patched.json()).resolves.toEqual({ settings: { defaultMount: "G", locale: "zh", supportPromptRespondedAt: null } });
  });

  it("rejects values outside the allowed set", async () => {
    const response = await settingsRoute.PATCH(json("PATCH", { defaultMount: "M" }));

    expect(response.status).toBe(400);
  });
});
