// KV has no atomic increment, so concurrent turns can overshoot a quota slightly; the
// per-IP request rate in src/lib/rate-limit.ts bounds by how much.

export const IRIS_QUOTA = {
  guestTurnsDaily: 3,
  // Clearing cookies starts a new guest session, so guests on one IP share a larger cap.
  guestIpTurnsDaily: 15,
  accountTurnsDaily: 20,
  globalDailyCny: 15,
  globalMonthlyCny: 50,
} as const;

/** The model PEAK_PRICE_CNY_PER_MTOK is for; a test fails when production switches models. */
export const PRICED_MODEL_ID = "deepseek-flash";

// https://api-docs.deepseek.com/zh-cn/quick_start/pricing. Off-peak is half; public holidays
// are off-peak too but are charged as peak here, since the calendar isn't known.
const PEAK_PRICE_CNY_PER_MTOK = { cacheHit: 0.04, cacheMiss: 2, output: 8 } as const;
const PEAK_HOURS_BEIJING = [
  [9, 12],
  [14, 18],
] as const;

export type IrisQuotaBlock = {
  kind: "guest_quota" | "account_quota" | "budget";
  /** Epoch ms when the quota that blocked the turn resets. */
  resetAt: number;
};

export interface IrisQuotaUser {
  userId: string;
  isAccount: boolean;
  ip: string | null;
}

export interface TurnUsage {
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
}

const DAY_MS = 86_400_000;
const KEY_TTL_SECONDS = 2 * 24 * 60 * 60;
const MONTH_KEY_TTL_SECONDS = 32 * 24 * 60 * 60;

function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function stored(raw: string | null): number {
  return count(Number(raw));
}

function isPeak(at: number): boolean {
  const beijing = new Date(at + 8 * 60 * 60 * 1000);
  const weekday = beijing.getUTCDay();
  const hour = beijing.getUTCHours();
  return weekday >= 1 && weekday <= 5 && PEAK_HOURS_BEIJING.some(([from, to]) => hour >= from && hour < to);
}

/** What a turn finished at `at` cost, in millionths of a yuan. */
export function turnCostMicroCny(usage: TurnUsage, at: number): number {
  const input = count(usage.inputTokens);
  const hits = Math.min(count(usage.cacheReadTokens), input);
  const peakCost =
    (input - hits) * PEAK_PRICE_CNY_PER_MTOK.cacheMiss +
    hits * PEAK_PRICE_CNY_PER_MTOK.cacheHit +
    count(usage.outputTokens) * PEAK_PRICE_CNY_PER_MTOK.output;
  return Math.round(isPeak(at) ? peakCost : peakCost / 2);
}

function periods(now: number) {
  const day = Math.floor(now / DAY_MS);
  const date = new Date(now);
  const month = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
  return {
    day,
    month,
    nextDay: (day + 1) * DAY_MS,
    nextMonth: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1),
  };
}

function keys(user: IrisQuotaUser, now: number) {
  const { day, month } = periods(now);
  return {
    userTurns: `iris:turns:user:${user.userId}:${day}`,
    guestIpTurns: user.ip ? `iris:turns:guest-ip:${user.ip}:${day}` : null,
    dayCost: `iris:cost:day:${day}`,
    monthCost: `iris:cost:month:${month}`,
  };
}

// Usage is only known once a turn finishes, so this rejects a turn whose quota is
// already spent and recordIrisTurn() charges it afterwards.
export async function checkIrisQuota(
  kv: KVNamespace,
  user: IrisQuotaUser,
  now = Date.now(),
): Promise<IrisQuotaBlock | null> {
  const k = keys(user, now);
  const { nextDay, nextMonth } = periods(now);
  const [monthCost, dayCost, userTurns, guestIpTurns] = await Promise.all([
    kv.get(k.monthCost),
    kv.get(k.dayCost),
    kv.get(k.userTurns),
    !user.isAccount && k.guestIpTurns ? kv.get(k.guestIpTurns) : null,
  ]);
  if (stored(monthCost) >= IRIS_QUOTA.globalMonthlyCny * 1_000_000) {
    return { kind: "budget", resetAt: nextMonth };
  }
  if (stored(dayCost) >= IRIS_QUOTA.globalDailyCny * 1_000_000) {
    return { kind: "budget", resetAt: nextDay };
  }
  if (user.isAccount) {
    return stored(userTurns) >= IRIS_QUOTA.accountTurnsDaily ? { kind: "account_quota", resetAt: nextDay } : null;
  }
  return stored(userTurns) >= IRIS_QUOTA.guestTurnsDaily || stored(guestIpTurns) >= IRIS_QUOTA.guestIpTurnsDaily
    ? { kind: "guest_quota", resetAt: nextDay }
    : null;
}

/** Charges a finished turn; `countsAsTurn` is false for a turn that only answers a card. */
export async function recordIrisTurn(
  kv: KVNamespace,
  user: IrisQuotaUser,
  usage: TurnUsage,
  { countsAsTurn, now = Date.now() }: { countsAsTurn: boolean; now?: number },
): Promise<void> {
  const k = keys(user, now);
  const add = async (key: string, amount: number, ttl: number) => {
    if (amount > 0) {
      await kv.put(key, String(stored(await kv.get(key)) + amount), { expirationTtl: ttl });
    }
  };
  const cost = turnCostMicroCny(usage, now);
  const turn = countsAsTurn ? 1 : 0;
  await Promise.all([
    add(k.dayCost, cost, KEY_TTL_SECONDS),
    add(k.monthCost, cost, MONTH_KEY_TTL_SECONDS),
    add(k.userTurns, turn, KEY_TTL_SECONDS),
    !user.isAccount && k.guestIpTurns ? add(k.guestIpTurns, turn, KEY_TTL_SECONDS) : undefined,
  ]);
}
