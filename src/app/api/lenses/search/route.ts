import { NextResponse } from "next/server";
import { getLensesByMount } from "@/lib/lens-data";
import { buildLensSearchIndex, searchLensIndex, type LensSearchIndex } from "@/lib/lens-search";
import { urlSegmentToMount } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import { routing } from "@/i18n/routing";
import { createRateLimiter, RATE_LIMITED_RESPONSE } from "@/lib/rate-limit";

const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 120 });

const MAX_QUERY_LENGTH = 200;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 30;

const indexCache = new Map<string, LensSearchIndex>();

function getCachedIndex(mount: Mount, locale: string): LensSearchIndex {
  const key = `${mount}:${locale}`;
  let index = indexCache.get(key);
  if (!index) {
    index = buildLensSearchIndex(getLensesByMount(mount, locale));
    indexCache.set(key, index);
  }
  return index;
}

export function GET(req: Request) {
  // Dormant endpoint with no consumers today — search runs client-side in the
  // browser (see LensSearchDialog). Reserved for a future internal BFF, never
  // external-facing; 404 in production until then, mirroring /api/lenses.
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  if (!checkRateLimit(req)) {
    return RATE_LIMITED_RESPONSE;
  }

  const { searchParams } = new URL(req.url);

  const mountParam = searchParams.get("mount");
  const locale = searchParams.get("locale");
  const query = searchParams.get("q");

  const mount = urlSegmentToMount(mountParam);
  if (!mount) {
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

  const index = getCachedIndex(mount, locale);
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
