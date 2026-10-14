import { beforeEach, describe, expect, it, vi } from "vitest";

const writeDataPoint = vi.hoisted(() => vi.fn());

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { ANALYTICS: { writeDataPoint } } }),
}));

const { POST } = await import("../route");

function post(body: unknown) {
  return POST(new Request("http://localhost/api/track", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  writeDataPoint.mockReset();
});

describe("POST /api/track", () => {
  it("writes a known event and sets the session cookie", async () => {
    const response = await post({ event: "search", locale: "en", props: { query: "56mm", results_count: 3 } });

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/);
    const point = writeDataPoint.mock.calls[0][0] as { indexes: string[]; blobs: string[]; doubles: number[] };
    expect(point.indexes).toEqual(["search"]);
    expect(point.blobs[3]).toBe("56mm");
    expect(point.doubles).toEqual([3]);
  });

  it("rejects an unknown event and a non-object props", async () => {
    expect((await post({ event: "made_up" })).status).toBe(400);
    expect((await post({ event: "search", props: "x" })).status).toBe(400);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it("drops malformed props, truncates long strings and ignores unknown keys", async () => {
    await post({
      event: "search",
      props: { query: "q".repeat(300), results_count: "3", extra: "x" },
    });

    const point = writeDataPoint.mock.calls[0][0] as { blobs: string[]; doubles: number[] };
    expect(point.blobs[3]).toHaveLength(256);
    expect(point.doubles).toEqual([0]);
  });
});
