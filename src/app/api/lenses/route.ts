import { NextResponse } from "next/server";
import {
  filterLenses,
  sortLenses,
  getLensesByMount,
  getOrderedUniqueBrands,
} from "@/lib/lens";
import { deriveSpecialty } from "@/lib/lens-specialty";
import { parseFilters } from "@/lib/filter-params";
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
  // parseFilters defaults `usage` to "photo" to match the client UI's default
  // view. This endpoint is a full-pool feed, so an absent usage param means
  // "no usage filter" here, not "photo" — otherwise cine lenses never reach the
  // client, which filters locally. An explicit `u` param is still honoured for
  // a future move to backend-driven filtering.
  if (searchParams.get("u") === null) {
    filters.usage = null;
  }
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
        "Cache-Control": "private, no-store",
      },
    },
  );
}
