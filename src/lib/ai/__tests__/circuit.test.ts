import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  CIRCUIT,
  isCircuitOpen,
  recordProviderFailure,
  recordProviderSuccess,
} from "../circuit";

// Minimal in-memory KVNamespace that honours expirationTtl against the (fake) clock, so
// the cooldown / half-open transitions are exercised deterministically.
function fakeKv(): KVNamespace {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  return {
    async get(key: string) {
      const e = store.get(key);
      if (!e) {
        return null;
      }
      if (e.expiresAt !== null && Date.now() >= e.expiresAt) {
        store.delete(key);
        return null;
      }
      return e.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      const expiresAt = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null;
      store.set(key, { value, expiresAt });
    },
    async delete(key: string) {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

async function fail(kv: KVNamespace, times: number) {
  for (let i = 0; i < times; i++) {
    await recordProviderFailure(kv);
  }
}

describe("DeepSeek circuit breaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("guards its own invariant: the fail window must outlive the cooldown", () => {
    // Half-open re-open depends on the failure streak surviving the cooldown.
    expect(CIRCUIT.failWindowSeconds).toBeGreaterThan(CIRCUIT.cooldownSeconds);
  });

  it("stays closed below the failure threshold", async () => {
    const kv = fakeKv();
    await fail(kv, CIRCUIT.failureThreshold - 1);
    expect(await isCircuitOpen(kv)).toBe(false);
  });

  it("opens once the failure threshold is reached", async () => {
    const kv = fakeKv();
    await fail(kv, CIRCUIT.failureThreshold);
    expect(await isCircuitOpen(kv)).toBe(true);
  });

  it("a success resets the streak so intermittent blips don't accumulate", async () => {
    const kv = fakeKv();
    await fail(kv, CIRCUIT.failureThreshold - 1);
    await recordProviderSuccess(kv);
    await fail(kv, CIRCUIT.failureThreshold - 1);
    expect(await isCircuitOpen(kv)).toBe(false);
  });

  it("half-opens after the cooldown, then re-opens on a single failed probe", async () => {
    const kv = fakeKv();
    await fail(kv, CIRCUIT.failureThreshold);
    expect(await isCircuitOpen(kv)).toBe(true);

    vi.setSystemTime(CIRCUIT.cooldownSeconds * 1000 + 1); // cooldown elapses
    expect(await isCircuitOpen(kv)).toBe(false); // half-open: a probe is allowed through

    await recordProviderFailure(kv); // the probe fails
    expect(await isCircuitOpen(kv)).toBe(true); // re-opens immediately, no fresh threshold
  });

  it("a successful half-open probe closes the circuit and clears the streak", async () => {
    const kv = fakeKv();
    await fail(kv, CIRCUIT.failureThreshold);

    vi.setSystemTime(CIRCUIT.cooldownSeconds * 1000 + 1);
    await recordProviderSuccess(kv); // the probe succeeds
    expect(await isCircuitOpen(kv)).toBe(false);

    // streak cleared: it now takes a full fresh threshold to open again
    await fail(kv, CIRCUIT.failureThreshold - 1);
    expect(await isCircuitOpen(kv)).toBe(false);
  });
});
