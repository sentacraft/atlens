import { NextResponse } from "next/server";
import {
  filterLenses,
  sortLenses,
  getOrderedUniqueBrands,
} from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { deriveSpecialty } from "@/lib/lens/specialty";
import { parseFilters } from "@/lib/url/filter-params";
import { urlSegmentToMount } from "@/lib/mount";
import { OPTICAL_TRAITS, type OpticalTrait } from "@/lib/types";
import { routing } from "@/i18n/routing";
import { createRateLimiter, RATE_LIMITED_RESPONSE } from "@/lib/rate-limit";

const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 120 });

function computeAvailableOpticalTraits(lenses: { isCine?: boolean; opticalTraits?: OpticalTrait[] }[]): OpticalTrait[] {
  const present = new Set(
    lenses.flatMap((l) => deriveSpecialty(l).opticalTraits),
  );
  return OPTICAL_TRAITS.filter((trait) => present.has(trait));
}

export function GET(req: Request) {
  // Dormant endpoint with no consumers today; reserved for a future internal
  // BFF, never external-facing. 404 in production until that lands so it is not
  // a live, full-dataset surface. (A page would call notFound(); a route
  // handler returns the 404 response directly.)
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  if (!checkRateLimit(req)) {
    return RATE_LIMITED_RESPONSE;
  }

  const { searchParams } = new URL(req.url);

  const mountParam = searchParams.get("mount");
  const locale = searchParams.get("locale");

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

  const allLenses = getLensesByMount(mount, locale);

  const filters = parseFilters(searchParams);
  const filtered = filterLenses(allLenses, filters);
  const sorted = sortLenses(filtered, filters.sort, filters.sortDir);

  let result = sorted;
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  if (pageParam && limitParam) {
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));
    const start = (page - 1) * limit;
    result = sorted.slice(start, start + limit);
  }

  const brands = getOrderedUniqueBrands(allLenses);
  const availableOpticalTraits = computeAvailableOpticalTraits(allLenses);

  return NextResponse.json(
    {
      lenses: result,
      total: sorted.length,
      brands,
      availableOpticalTraits,
    },
    {
      headers: {
        // `no-store` because nothing on the site calls this at runtime (the UI
        // filters client-side over props), so caching buys nothing today. The
        // payload is derived entirely from build-static data (lenses.json) and
        // only changes on redeploy — so if this becomes a public/hot endpoint,
        // revisit: it is safe to cache aggressively (e.g. a long `s-maxage`
        // keyed on the query params) instead of `no-store`.
        "Cache-Control": "private, no-store",
      },
    },
  );
}
