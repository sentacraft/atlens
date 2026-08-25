// Abuse guard for the (public, no-login) /api/chat endpoint, keyed off the caller's
// Cloudflare edge IP and backed by the RATE_KV namespace.
//
// The Cloudflare ASKIRIS_BURST binding owns the short-window request count. This module
// keeps the two daily TOKEN budgets because their values are only known after a model
// request finishes and they are not expressible through the native request limiter.
//
// KV has no atomic increment, so the counters are read-modify-write and thus loose
// under concurrency. This is cost deterrence, not strict metering.

export const RATE_LIMIT = {
  perIpDailyTokens: 400_000,
  globalDailyTokens: 15_000_000,
} as const;

const BYPASS_COOKIE = "rate_bypass";
const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;

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

// Proactive gate: reject if either daily token budget is already spent. Token usage is
// added after the request finishes by recordTokens().
export async function checkDailyTokenBudget(
  kv: KVNamespace,
  ip: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const day = Math.floor(Date.now() / 86_400_000);
  if (toCount(await kv.get(`tok:ip:${ip}:${day}`)) >= RATE_LIMIT.perIpDailyTokens) {
    return { ok: false, reason: "ip-daily" };
  }
  if (toCount(await kv.get(`tok:global:${day}`)) >= RATE_LIMIT.globalDailyTokens) {
    return { ok: false, reason: "global" };
  }

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
