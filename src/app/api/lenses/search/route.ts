import { NextResponse } from "next/server";
import { getLensesByMount } from "@/lib/lens/data";
import { buildLensSearchIndex, searchLensIndex, type LensSearchIndex } from "@/lib/lens/search";
import { urlSegmentToMount } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import { routing } from "@/i18n/routing";

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

/** Ranks one mount's lenses against a search query. No consumers (search runs in the browser): 404 in production. */
export function GET(req: Request) {
  // No consumers yet (search runs client-side); 404 in production.
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
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
