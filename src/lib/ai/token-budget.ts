// KV has no atomic increment, so concurrent turns can overshoot a budget slightly; the
// per-IP request rate in src/lib/rate-limit.ts bounds by how much.

export const TOKEN_BUDGET = {
  perIpDaily: 400_000,
  globalDaily: 15_000_000,
} as const;

const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;

function toCount(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function dayKeys(ip: string): { ip: string; global: string } {
  const day = Math.floor(Date.now() / 86_400_000);
  return { ip: `tok:ip:${ip}:${day}`, global: `tok:global:${day}` };
}

// Usage is only known once a turn finishes, so this rejects a turn whose budget is
// already spent and recordTokens() charges it afterwards.
export async function isOverTokenBudget(kv: KVNamespace, ip: string): Promise<boolean> {
  const keys = dayKeys(ip);
  return (
    toCount(await kv.get(keys.ip)) >= TOKEN_BUDGET.perIpDaily ||
    toCount(await kv.get(keys.global)) >= TOKEN_BUDGET.globalDaily
  );
}

export async function recordTokens(kv: KVNamespace, ip: string, tokens: number): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) {
    return;
  }
  const keys = dayKeys(ip);
  for (const key of [keys.ip, keys.global]) {
    const next = toCount(await kv.get(key)) + tokens;
    await kv.put(key, String(next), { expirationTtl: DAY_TTL_SECONDS });
  }
}
