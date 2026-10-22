import { describe, expect, it } from "vitest";
import { DEFAULT_AGENT_MODEL_PRESET } from "../model-presets";
import { checkIrisQuota, IRIS_QUOTA, PRICED_MODEL_ID, recordIrisTurn, turnCostMicroCny } from "../iris-quota";

function memoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

const NOW = Date.UTC(2026, 9, 22, 10, 30);
const NEXT_DAY = Date.UTC(2026, 9, 23);
const NEXT_MONTH = Date.UTC(2026, 10, 1);
const guest = { userId: "anon-1", isAccount: false, ip: "203.0.113.1" };
const account = { userId: "user-1", isAccount: true, ip: "203.0.113.1" };
const cheapTurn = { inputTokens: 1000, cacheReadTokens: 0, outputTokens: 100 };

async function recordTurns(kv: KVNamespace, who: typeof guest, count: number, now = NOW) {
  for (let i = 0; i < count; i++) {
    await recordIrisTurn(kv, who, cheapTurn, { countsAsTurn: true, now });
  }
}

describe("Iris quota", () => {
  it("prices the model production runs", () => {
    expect(DEFAULT_AGENT_MODEL_PRESET.modelId).toBe(PRICED_MODEL_ID);
  });

  // Wednesday 2026-10-21, 10:30 and 20:00 Beijing time.
  const PEAK = Date.UTC(2026, 9, 21, 2, 30);
  const OFF_PEAK = Date.UTC(2026, 9, 21, 12);
  const usage = { inputTokens: 10_000, cacheReadTokens: 1000, outputTokens: 1000 };

  it("charges cache hits, cache misses and output at their own peak-hour rates", () => {
    // 9k misses at 2, 1k hits at 0.04 and 1k output at 8 CNY per million tokens.
    expect(turnCostMicroCny(usage, PEAK)).toBe(18_000 + 40 + 8000);
  });

  it("charges half outside DeepSeek's weekday peak hours", () => {
    const peak = turnCostMicroCny(usage, PEAK);
    expect(turnCostMicroCny(usage, OFF_PEAK)).toBe(peak / 2);
    // 12:30 Beijing (lunch gap), and Saturday 10:30 Beijing.
    expect(turnCostMicroCny(usage, Date.UTC(2026, 9, 21, 4, 30))).toBe(peak / 2);
    expect(turnCostMicroCny(usage, Date.UTC(2026, 9, 24, 2, 30))).toBe(peak / 2);
    // 17:59 Beijing is still peak; 18:00 is not.
    expect(turnCostMicroCny(usage, Date.UTC(2026, 9, 21, 9, 59))).toBe(peak);
    expect(turnCostMicroCny(usage, Date.UTC(2026, 9, 21, 10))).toBe(peak / 2);
  });

  it("stops a guest after the guest's daily turns, until the next UTC day", async () => {
    const kv = memoryKv();

    await recordTurns(kv, guest, IRIS_QUOTA.guestTurnsDaily - 1);
    expect(await checkIrisQuota(kv, guest, NOW)).toBeNull();

    await recordTurns(kv, guest, 1);
    expect(await checkIrisQuota(kv, guest, NOW)).toEqual({ kind: "guest_quota", resetAt: NEXT_DAY });
    expect(await checkIrisQuota(kv, guest, NEXT_DAY)).toBeNull();
  });

  it("stops new guest sessions from an IP that has used the guest IP allowance", async () => {
    const kv = memoryKv();
    const perSession = IRIS_QUOTA.guestTurnsDaily;
    for (let i = 0; i * perSession < IRIS_QUOTA.guestIpTurnsDaily; i++) {
      await recordTurns(kv, { ...guest, userId: `anon-${i}` }, perSession);
    }

    expect(await checkIrisQuota(kv, { ...guest, userId: "anon-fresh" }, NOW)).toEqual({
      kind: "guest_quota",
      resetAt: NEXT_DAY,
    });
    expect(await checkIrisQuota(kv, account, NOW)).toBeNull();
  });

  it("gives an account more turns than a guest", async () => {
    const kv = memoryKv();

    await recordTurns(kv, account, IRIS_QUOTA.accountTurnsDaily - 1);
    expect(await checkIrisQuota(kv, account, NOW)).toBeNull();

    await recordTurns(kv, account, 1);
    expect(await checkIrisQuota(kv, account, NOW)).toEqual({ kind: "account_quota", resetAt: NEXT_DAY });
  });

  it("does not count a turn that only answers a card", async () => {
    const kv = memoryKv();
    for (let i = 0; i < IRIS_QUOTA.guestTurnsDaily; i++) {
      await recordIrisTurn(kv, guest, cheapTurn, { countsAsTurn: false, now: NOW });
    }

    expect(await checkIrisQuota(kv, guest, NOW)).toBeNull();
  });

  it("stops everyone once the day's spend is used up", async () => {
    const kv = memoryKv();
    const costly = { inputTokens: 10_000_000, cacheReadTokens: 0, outputTokens: 0 };
    for (let spent = 0; spent < IRIS_QUOTA.globalDailyCny * 1_000_000; spent += turnCostMicroCny(costly, NOW)) {
      await recordIrisTurn(kv, account, costly, { countsAsTurn: false, now: NOW });
    }

    expect(await checkIrisQuota(kv, { ...account, userId: "user-2", ip: "198.51.100.1" }, NOW)).toEqual({
      kind: "budget",
      resetAt: NEXT_DAY,
    });
  });

  it("stops everyone until next month once the month's spend is used up", async () => {
    const kv = memoryKv();
    const costly = { inputTokens: 10_000_000, cacheReadTokens: 0, outputTokens: 0 };
    let day = Date.UTC(2026, 9, 1);
    for (let spent = 0; spent < IRIS_QUOTA.globalMonthlyCny * 1_000_000; day += 86_400_000) {
      await recordIrisTurn(kv, account, costly, { countsAsTurn: false, now: day });
      spent += turnCostMicroCny(costly, day);
    }

    expect(await checkIrisQuota(kv, { ...account, userId: "user-2" }, day)).toEqual({
      kind: "budget",
      resetAt: NEXT_MONTH,
    });
  });

  it("ignores usage the provider did not report", async () => {
    const kv = memoryKv();

    await recordIrisTurn(kv, guest, { inputTokens: Number.NaN, cacheReadTokens: 0, outputTokens: -5 }, {
      countsAsTurn: false,
      now: NOW,
    });

    expect(await checkIrisQuota(kv, guest, NOW)).toBeNull();
    expect(turnCostMicroCny({ inputTokens: Number.NaN, cacheReadTokens: 0, outputTokens: -5 }, NOW)).toBe(0);
  });
});
