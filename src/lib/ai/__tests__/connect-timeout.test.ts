import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { connectTimeoutFetch } from "../connect-timeout";

// Fake fetch: resolves with a Response `headersDelayMs` after it's called, unless its signal
// aborts first — in which case it rejects with the abort reason, like a real aborted fetch.
function fakeFetch(headersDelayMs: number): typeof fetch {
  return (_input, init) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      const t = setTimeout(() => resolve(new Response("ok")), headersDelayMs);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(signal.reason ?? new DOMException("aborted", "AbortError"));
      });
    });
}

describe("connectTimeoutFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes through when headers arrive before the connect timeout", async () => {
    const wrapped = connectTimeoutFetch(1000, fakeFetch(200));
    const p = wrapped("https://example.test");
    await vi.advanceTimersByTimeAsync(200);
    const res = await p;
    expect(res.ok).toBe(true);
  });

  it("aborts with a TimeoutError when headers don't arrive in time", async () => {
    const wrapped = connectTimeoutFetch(1000, fakeFetch(5000));
    const p = wrapped("https://example.test");
    const assertion = expect(p).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("propagates an upstream abort (the caller's total timeout / disconnect)", async () => {
    const upstream = new AbortController();
    const wrapped = connectTimeoutFetch(10_000, fakeFetch(5000));
    const p = wrapped("https://example.test", { signal: upstream.signal });
    const assertion = expect(p).rejects.toMatchObject({ name: "AbortError" });
    upstream.abort(new DOMException("upstream", "AbortError"));
    await assertion;
  });
});
