import { describe, expect, it } from "vitest";
import { POST } from "../route";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/stats-preference", { method: "POST", body: JSON.stringify(body) }));
}

describe("POST /api/stats-preference", () => {
  it("sets the opt-out cookie when turned off", async () => {
    const res = await post({ enabled: false });
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/atlens_no_stats=1.*Max-Age=31536000/i);
  });

  it("clears the cookie when turned back on", async () => {
    const res = await post({ enabled: true });
    expect(res.headers.get("set-cookie")).toMatch(/atlens_no_stats=;.*Max-Age=0/i);
  });

  it("rejects a malformed body", async () => {
    expect((await post({ enabled: "no" })).status).toBe(400);
  });
});
