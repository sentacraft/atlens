import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/telemetry", { method: "POST", body: JSON.stringify(body) }));
}

const log = vi.spyOn(console, "log").mockImplementation(() => {});

afterEach(() => {
  log.mockClear();
});

describe("POST /api/telemetry", () => {
  it("logs an asset error", async () => {
    const response = await post({ evt: "asset-error", tag: "IMG", url: "/a.webp", ts: 1, page: "/en" });

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith("[tlm]", expect.stringContaining('"evt":"asset-error"'));
  });

  it("logs a slow asset", async () => {
    const response = await post({
      evt: "slow-asset", kind: "img", url: "/a.webp", duration: 4000, ttfb: 900, ts: 1, page: "/en",
    });

    expect(response.status).toBe(204);
  });

  it("rejects an unknown event or a missing field", async () => {
    expect((await post({ evt: "other", ts: 1, page: "/" })).status).toBe(400);
    expect((await post({ evt: "slow-asset", kind: "img", url: "/a", ts: 1, page: "/" })).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });
});
