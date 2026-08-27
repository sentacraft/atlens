import { describe, expect, it } from "vitest";
import { rateLimitedResponse } from "../rate-limit";

describe("rateLimitedResponse", () => {
  it("returns a 429 carrying the rate_limited error", async () => {
    const res = rateLimitedResponse();
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ error: "rate_limited" });
  });

  it("gives every caller its own readable body", async () => {
    const first = rateLimitedResponse();
    const second = rateLimitedResponse();

    await expect(first.json()).resolves.toEqual({ error: "rate_limited" });
    // A shared instance would fail here: the first read consumes the stream, and
    // the second request's response would throw instead of returning 429.
    await expect(second.json()).resolves.toEqual({ error: "rate_limited" });
  });
});
