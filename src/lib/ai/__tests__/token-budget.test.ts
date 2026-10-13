import { describe, expect, it } from "vitest";
import { isOverTokenBudget, recordTokens, TOKEN_BUDGET } from "../token-budget";

function memoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

describe("token budget", () => {
  it("rejects an IP once its daily budget is spent", async () => {
    const kv = memoryKv();

    await recordTokens(kv, "203.0.113.1", TOKEN_BUDGET.perIpDaily - 1);
    expect(await isOverTokenBudget(kv, "203.0.113.1")).toBe(false);

    await recordTokens(kv, "203.0.113.1", 1);
    expect(await isOverTokenBudget(kv, "203.0.113.1")).toBe(true);
    expect(await isOverTokenBudget(kv, "203.0.113.2")).toBe(false);
  });

  it("rejects every IP once the global budget is spent", async () => {
    const kv = memoryKv();

    await recordTokens(kv, "203.0.113.1", TOKEN_BUDGET.globalDaily);

    expect(await isOverTokenBudget(kv, "203.0.113.2")).toBe(true);
  });

  it("ignores non-positive or non-finite usage", async () => {
    const kv = memoryKv();

    await recordTokens(kv, "203.0.113.1", Number.NaN);
    await recordTokens(kv, "203.0.113.1", -5);

    expect(await kv.get(`tok:global:${Math.floor(Date.now() / 86_400_000)}`)).toBeNull();
  });
});
