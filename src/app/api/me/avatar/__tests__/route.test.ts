import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createSqliteD1 } from "@/lib/__tests__/support/sqlite-d1";

const mocks = vi.hoisted(() => ({
  userId: undefined as string | undefined,
  db: undefined as unknown,
  overCap: false,
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { APP_DB: mocks.db } }),
}));
vi.mock("@/lib/auth-session", () => ({
  getAccountUserId: async () => mocks.userId,
}));
vi.mock("@/lib/rate-limit", () => ({
  isOverDailyCap: async () => mocks.overCap,
}));

const { GET, PUT, DELETE } = await import("../route");

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
let sqlite: DatabaseSync;

const put = (body: Uint8Array<ArrayBuffer>) => new Request("http://localhost/api/me/avatar", { method: "PUT", body });
const req = (method = "GET") => new Request("http://localhost/api/me/avatar", { method });
const userImage = () => (sqlite.prepare("SELECT image FROM user WHERE id = 'u1'").get() as { image: string | null }).image;

beforeEach(() => {
  const created = createSqliteD1("migrations/app");
  sqlite = created.sqlite;
  sqlite.prepare("INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES ('u1', 'u1', 'u1@example.test', 0, 0)").run();
  mocks.db = created.d1;
  mocks.userId = "u1";
  mocks.overCap = false;
});

describe("/api/me/avatar", () => {
  it("answers 401 without an account", async () => {
    mocks.userId = undefined;

    const statuses = await Promise.all([GET(req()), PUT(put(JPEG)), DELETE(req("DELETE"))]).then((r) => r.map((x) => x.status));

    expect(statuses).toEqual([401, 401, 401]);
  });

  it("stores an uploaded JPEG and serves it back to its owner", async () => {
    const response = await PUT(put(JPEG));

    expect(response.status).toBe(200);
    const { image } = (await response.json()) as { image: string };
    expect(image).toMatch(/^\/api\/me\/avatar\?v=\d+$/);
    expect(userImage()).toBe(image);

    const served = await GET(req());
    expect(served.headers.get("content-type")).toBe("image/jpeg");
    expect(served.headers.get("cache-control")).toContain("private");
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(JPEG);
  });

  it("refuses a file that is not a JPEG or PNG", async () => {
    const response = await PUT(put(new TextEncoder().encode("<svg onload=alert(1)>")));

    expect(response.status).toBe(415);
    expect(userImage()).toBeNull();
  });

  it("refuses a file over the size limit", async () => {
    const big = new Uint8Array(100_001);
    big.set(JPEG);

    expect((await PUT(put(big))).status).toBe(413);
  });

  it("refuses uploads past the daily cap", async () => {
    mocks.overCap = true;

    expect((await PUT(put(JPEG))).status).toBe(429);
  });

  it("answers 404 when there is no photo", async () => {
    expect((await GET(req())).status).toBe(404);
  });

  it("removes the photo", async () => {
    await PUT(put(JPEG));

    const response = await DELETE(req("DELETE"));

    expect(response.status).toBe(204);
    expect(userImage()).toBeNull();
    expect((await GET(req())).status).toBe(404);
  });
});
