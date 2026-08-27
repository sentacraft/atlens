// Abuse guard for the (public, no-login) /api/chat endpoint, keyed off the caller's
// Cloudflare edge IP and backed by the RATE_KV namespace.
//
// Two axes, because they bound different things:
//   - burst (a request COUNT per minute) bounds the RATE. It's the only check we can
//     make BEFORE spending anything, and it caps how much a flood can overshoot the
//     token budgets before their post-request accounting catches up.
//   - per-IP and global daily TOKEN budgets bound the SPEND (the wallet). Token usage
//     is only known once a request finishes, so these are checked proactively ("are
//     we already over?") and incremented afterwards via recordTokens().
//
// KV has no atomic increment, so the counters are read-modify-write and thus loose
// under concurrency — fine here, since the burst gate bounds concurrency and this is
// deterrence, not strict metering.

export const RATE_LIMIT = {
  burstPerMinute: 6,
  perIpDailyTokens: 400_000,
  globalDailyTokens: 15_000_000,
} as const;

const BYPASS_COOKIE = "rate_bypass";
const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;
const BURST_TTL_SECONDS = 120;

// Cloudflare sets CF-Connecting-IP to the real client IP and strips any client-sent
// copy, so it can't be spoofed at the edge. Absent off-Cloudflare (e.g. `next dev`).
export function clientIp(req: Request): string | null {
  return req.headers.get("CF-Connecting-IP");
}

// A request is exempt only if it carries the bypass cookie whose value EQUALS the
// server-side secret — never mere presence of a known cookie, which a script could
// forge on a raw request. No secret configured = no bypass.
export function isBypassed(req: Request, secret: string | undefined): boolean {
  if (!secret) {
    return false;
  }
  const cookie = req.headers.get("cookie");
  if (!cookie) {
    return false;
  }
  for (const part of cookie.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === BYPASS_COOKIE && value === secret) {
      return true;
    }
  }
  return false;
}

function toCount(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// Proactive gate: reject if the burst rate or either daily token budget is already
// spent. Reserves the burst slot only when letting the request through.
export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = Math.floor(now / 86_400_000);

  const burstKey = `burst:${ip}:${minute}`;
  const burst = toCount(await kv.get(burstKey));
  if (burst >= RATE_LIMIT.burstPerMinute) {
    return { ok: false, reason: "burst" };
  }
  if (toCount(await kv.get(`tok:ip:${ip}:${day}`)) >= RATE_LIMIT.perIpDailyTokens) {
    return { ok: false, reason: "ip-daily" };
  }
  if (toCount(await kv.get(`tok:global:${day}`)) >= RATE_LIMIT.globalDailyTokens) {
    return { ok: false, reason: "global" };
  }

  await kv.put(burstKey, String(burst + 1), { expirationTtl: BURST_TTL_SECONDS });
  return { ok: true };
}

// Post-request accounting: fold the finished request's real token usage into the
// per-IP and global daily counters. Call from streamText's onFinish.
export async function recordTokens(kv: KVNamespace, ip: string, tokens: number): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) {
    return;
  }
  const day = Math.floor(Date.now() / 86_400_000);
  for (const key of [`tok:ip:${ip}:${day}`, `tok:global:${day}`]) {
    const next = toCount(await kv.get(key)) + tokens;
    await kv.put(key, String(next), { expirationTtl: DAY_TTL_SECONDS });
  }
}
