import { NextResponse } from "next/server";
import {
  filterLenses,
  sortLenses,
  getLensesByMount,
  getOrderedUniqueBrands,
} from "@/lib/lens";
import { deriveSpecialty } from "@/lib/lens-specialty";
import { parseFilters } from "@/lib/filter-params";
import { urlSegmentToMount, type MountSegment } from "@/lib/mount";
import { OPTICAL_TRAITS, type OpticalTrait } from "@/lib/types";
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

function computeAvailableOpticalTraits(lenses: { isCine?: boolean; opticalTraits?: OpticalTrait[] }[]): OpticalTrait[] {
  const present = new Set(
    lenses.flatMap((l) => deriveSpecialty(l).opticalTraits),
  );
  return OPTICAL_TRAITS.filter((trait) => present.has(trait));
}

export function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);

  const mountParam = searchParams.get("mount");
  const locale = searchParams.get("locale");

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

  const mount = urlSegmentToMount(mountParam as MountSegment)!;
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
        "Cache-Control": "private, no-store",
      },
    },
  );
}
