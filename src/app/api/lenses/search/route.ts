import { NextResponse } from "next/server";
import { getLensesByMount } from "@/lib/lens";
import { buildLensSearchIndex, searchLensIndex, type LensSearchIndex } from "@/lib/lens-search";
import { urlSegmentToMount, type MountSegment } from "@/lib/mount";
import { routing } from "@/i18n/routing";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

const VALID_MOUNTS: readonly string[] = ["x", "gfx"];
const MAX_QUERY_LENGTH = 200;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 30;

const indexCache = new Map<string, LensSearchIndex>();

function getCachedIndex(mount: string, locale: string): LensSearchIndex {
  const key = `${mount}:${locale}`;
  let index = indexCache.get(key);
  if (!index) {
    const resolvedMount = urlSegmentToMount(mount as MountSegment)!;
    index = buildLensSearchIndex(getLensesByMount(resolvedMount, locale));
    indexCache.set(key, index);
  }
  return index;
}

export function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);

  const mountParam = searchParams.get("mount");
  const locale = searchParams.get("locale");
  const query = searchParams.get("q");

  if (!mountParam || !VALID_MOUNTS.includes(mountParam)) {
    return NextResponse.json(
      { error: "invalid or missing 'mount' param (expected 'x' or 'gfx')" },
      { status: 400 },
    );
  }
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    return NextResponse.json(
      { error: `invalid or missing 'locale' param (expected ${routing.locales.join(" or ")})` },
      { status: 400 },
    );
  }
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "missing or empty 'q' param" },
      { status: 400 },
    );
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `query too long (max ${MAX_QUERY_LENGTH} chars)` },
      { status: 400 },
    );
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.max(1, Math.min(MAX_LIMIT, parseInt(limitParam, 10) || DEFAULT_LIMIT))
    : DEFAULT_LIMIT;

  const index = getCachedIndex(mountParam, locale);
  const results = searchLensIndex(index, query.trim(), limit);

  return NextResponse.json(
    { results, query: query.trim() },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
