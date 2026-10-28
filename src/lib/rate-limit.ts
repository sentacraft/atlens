import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Every limit the app enforces:
 *
 * - Per-IP request rates: the policies below, as `[[ratelimits]]` bindings in wrangler.toml.
 * - Per-IP daily caps: DAILY_CAPS below (KV).
 * - Ask Iris daily turns per guest and account, and its global daily and monthly spend:
 *   src/lib/ai/iris-quota.ts (KV).
 * - /api/auth/*: Better Auth's own limiter, configured in src/lib/auth.ts (D1).
 *
 * The Cloudflare dashboard has no security or rate-limiting rules for atlens.app.
 */
const POLICY_BINDINGS = {
  feedback: "RL_FEEDBACK",
  askirisFeedback: "RL_ASKIRIS_FEEDBACK",
  chat: "RL_CHAT",
  lensReviews: "RL_LENS_REVIEWS",
  analytics: "RL_ANALYTICS",
} as const satisfies Record<string, keyof CloudflareEnv>;

export const DAILY_CAPS = {
  feedback: 20,
} as const;

const DAILY_CAP_TTL_SECONDS = 2 * 24 * 60 * 60;

export type RateLimitPolicy = keyof typeof POLICY_BINDINGS;

const BYPASS_COOKIE = "rate_bypass";

// X-Forwarded-For is client-supplied; Cloudflare overwrites this header.
export function clientIp(req: Request): string | null {
  return req.headers.get("cf-connecting-ip");
}

export function isBypassed(req: Request): boolean {
  const secret = process.env.RATE_LIMIT_BYPASS;
  if (!secret) {
    return false;
  }
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === BYPASS_COOKIE && value === secret) {
      return true;
    }
  }
  return false;
}

export async function isRateLimited(req: Request, policy: RateLimitPolicy): Promise<boolean> {
  const ip = clientIp(req);
  if (!ip || isBypassed(req)) {
    return false;
  }
  const { success } = await getCloudflareContext().env[POLICY_BINDINGS[policy]].limit({ key: ip });
  return !success;
}

/** Counts this request against the client's cap for the current UTC day. */
export async function isOverDailyCap(req: Request, cap: keyof typeof DAILY_CAPS): Promise<boolean> {
  const ip = clientIp(req);
  if (!ip || isBypassed(req)) {
    return false;
  }
  const kv = getCloudflareContext().env.RATE_KV;
  const key = `daily:${cap}:${ip}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await kv.get(key)) || 0;
  if (used >= DAILY_CAPS[cap]) {
    return true;
  }
  await kv.put(key, String(used + 1), { expirationTtl: DAILY_CAP_TTL_SECONDS });
  return false;
}

// A Response body can be read once, so each caller needs its own instance.
export function rateLimitedResponse(): NextResponse {
  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}
