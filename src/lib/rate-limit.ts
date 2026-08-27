import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  return function checkRateLimit(req: Request): boolean {
    const ip = getClientIp(req);
    const now = Date.now();
    const bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count >= max) {
      return false;
    }
    bucket.count += 1;
    return true;
  };
}

// A function, not a shared constant: a Response body is a stream that can only be
// consumed once, so returning the same instance from a second rate-limited request
// throws on read and the caller gets a 500 instead of a 429.
export function rateLimitedResponse(): NextResponse {
  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}
