import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn<(options: { key: string }) => Promise<{ success: boolean }>>();
const kv = new Map<string, string>();
const env = {
  RL_FEEDBACK: { limit },
  RL_ASKIRIS_FEEDBACK: { limit },
  RL_CHAT: { limit },
  RATE_KV: {
    get: async (key: string) => kv.get(key) ?? null,
    put: async (key: string, value: string) => void kv.set(key, value),
  },
};

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env }),
}));

const { DAILY_CAPS, isOverDailyCap, isRateLimited, rateLimitedResponse } = await import("../rate-limit");

function request(headers: Record<string, string>): Request {
  return new Request("https://atlens.app/api/feedback", { method: "POST", headers });
}

describe("isRateLimited", () => {
  let counts: Map<string, number>;

  beforeEach(() => {
    counts = new Map();
    limit.mockImplementation(async ({ key }) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= 2 };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    limit.mockReset();
  });

  it("limits a client once its binding rejects the key", async () => {
    const req = () => request({ "cf-connecting-ip": "203.0.113.1" });

    expect(await isRateLimited(req(), "feedback")).toBe(false);
    expect(await isRateLimited(req(), "feedback")).toBe(false);
    expect(await isRateLimited(req(), "feedback")).toBe(true);
  });

  it("keys on cf-connecting-ip, ignoring a forged X-Forwarded-For", async () => {
    for (const forged of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
      await isRateLimited(
        request({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": forged }),
        "feedback",
      );
    }

    expect(limit).toHaveBeenLastCalledWith({ key: "203.0.113.1" });
    expect(counts.get("203.0.113.1")).toBe(3);
  });

  it("skips requests that did not come through Cloudflare", async () => {
    expect(await isRateLimited(request({}), "chat")).toBe(false);
    expect(limit).not.toHaveBeenCalled();
  });

  it("exempts the bypass cookie only when it matches the configured secret", async () => {
    vi.stubEnv("RATE_LIMIT_BYPASS", "s3cret");
    const ip = { "cf-connecting-ip": "203.0.113.1" };

    expect(await isRateLimited(request({ ...ip, cookie: "rate_bypass=s3cret" }), "chat")).toBe(
      false,
    );
    expect(limit).not.toHaveBeenCalled();

    await isRateLimited(request({ ...ip, cookie: "rate_bypass=guess" }), "chat");
    expect(limit).toHaveBeenCalledTimes(1);
  });

  it("ignores the bypass cookie when no secret is configured", async () => {
    vi.stubEnv("RATE_LIMIT_BYPASS", "");

    await isRateLimited(
      request({ "cf-connecting-ip": "203.0.113.1", cookie: "rate_bypass=" }),
      "chat",
    );

    expect(limit).toHaveBeenCalledTimes(1);
  });
});

describe("isOverDailyCap", () => {
  beforeEach(() => {
    kv.clear();
    vi.useFakeTimers({ now: new Date("2026-10-28T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const req = (ip = "203.0.113.1", cookie?: string) =>
    request({ "cf-connecting-ip": ip, ...(cookie ? { cookie } : {}) });

  it("lets a client through up to the cap, then holds it until the next UTC day", async () => {
    for (let i = 0; i < DAILY_CAPS.feedback; i++) {
      expect(await isOverDailyCap(req(), "feedback")).toBe(false);
    }
    expect(await isOverDailyCap(req(), "feedback")).toBe(true);
    expect(await isOverDailyCap(req("203.0.113.2"), "feedback")).toBe(false);

    vi.setSystemTime(new Date("2026-10-29T00:00:01Z"));
    expect(await isOverDailyCap(req(), "feedback")).toBe(false);
  });

  it("skips requests without a Cloudflare IP and the bypass cookie", async () => {
    vi.stubEnv("RATE_LIMIT_BYPASS", "s3cret");
    for (let i = 0; i <= DAILY_CAPS.feedback; i++) {
      expect(await isOverDailyCap(request({}), "feedback")).toBe(false);
      expect(await isOverDailyCap(req(undefined, "rate_bypass=s3cret"), "feedback")).toBe(false);
    }
    expect(kv.size).toBe(0);
  });
});

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
    await expect(second.json()).resolves.toEqual({ error: "rate_limited" });
  });
});
