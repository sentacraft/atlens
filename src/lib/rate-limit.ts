import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Every limit the app enforces:
 *
 * - Per-IP request rates: the policies below, as `[[ratelimits]]` bindings in wrangler.toml.
 * - Ask Iris daily token budgets, per IP and global: src/lib/ai/token-budget.ts (KV).
 * - /api/auth/*: Better Auth's own limiter, configured in src/lib/auth.ts (D1).
 *
 * The Cloudflare dashboard has no security or rate-limiting rules for atlens.app.
 */
const POLICY_BINDINGS = {
  feedback: "RL_FEEDBACK",
  askirisFeedback: "RL_ASKIRIS_FEEDBACK",
  chat: "RL_CHAT",
} as const satisfies Record<string, keyof CloudflareEnv>;

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

// A function, not a shared constant: a Response body is a stream that can only be
// consumed once, so returning the same instance from a second rate-limited request
// throws on read and the caller gets a 500 instead of a 429.
export function rateLimitedResponse(): NextResponse {
  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}
