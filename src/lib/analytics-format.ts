// Server-only formatters used by the /admin/analytics dashboard to turn
// the raw rows that come out of Analytics Engine into something a human
// can actually scan. Keep these functions pure and synchronous so they
// stay cheap to call inline in JSX cells.

import { defaultFilters } from "@/lib/lens";
import { getAllLenses } from "@/lib/lens-data";
import { lensDisplayName } from "@/lib/lens.format";

// Lazy-built lookup: slug → "Brand Series Model". Resolved once per
// server process (the analytics route is force-dynamic but the catalog
// itself never changes between requests within a deploy).
let lensNameCache: Map<string, string> | null = null;

function lensNameMap(): Map<string, string> {
  if (lensNameCache) {
    return lensNameCache;
  }
  const map = new Map<string, string>();
  for (const lens of getAllLenses("en")) {
    const brandLabel = lens.brand.charAt(0).toUpperCase() + lens.brand.slice(1);
    map.set(lens.id, lensDisplayName(brandLabel, lens.series, lens.model));
  }
  lensNameCache = map;
  return map;
}

// Replace one slug with its display name; fall back to the slug if the
// lens has been removed from the catalog (so the dashboard never breaks
// on stale events).
export function formatLensSlug(slug: string): string {
  return lensNameMap().get(slug) ?? slug;
}

// Replace a comma-separated slug list (used by compare_view.lens_slugs)
// with a comma-separated display-name list, suitable for a single cell
// with `title` set to the original string.
export function formatLensSlugList(joined: string): string {
  if (!joined) {
    return "";
  }
  return joined
    .split(",")
    .map((s) => formatLensSlug(s.trim()))
    .join(" · ");
}

// Compact, human-readable summary of a filter_apply snapshot. Drops
// any field that is null / empty array / empty string so that the
// "interesting" parts of the filter stand out.
//
// Example input:
//   {"brands":["sigma"],"typeFilter":"zoom","focusFilter":"auto",
//    "usage":"photo","focusMotorClass":null,"features":[],
//    "focalCategories":["standard"]}
// Becomes:
//   "Brand: sigma · Zoom · AF · Focal: standard"
export function formatFilterSnapshot(json: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return json;
  }
  if (!parsed || typeof parsed !== "object") {
    return json;
  }
  const f = parsed as Record<string, unknown>;
  const parts: string[] = [];

  const brands = f.brands;
  if (Array.isArray(brands) && brands.length > 0) {
    parts.push(`Brand: ${brands.join(",")}`);
  }
  if (typeof f.typeFilter === "string" && f.typeFilter) {
    parts.push(f.typeFilter === "prime" ? "Prime" : "Zoom");
  }
  if (typeof f.focusFilter === "string" && f.focusFilter) {
    parts.push(f.focusFilter === "auto" ? "AF" : "MF");
  }
  if (typeof f.usage === "string" && f.usage !== defaultFilters.usage) {
    parts.push(`Usage: ${f.usage}`);
  }
  if (typeof f.focusMotorClass === "string" && f.focusMotorClass) {
    parts.push(`Motor: ${f.focusMotorClass}`);
  }
  const features = f.features;
  if (Array.isArray(features) && features.length > 0) {
    parts.push(`Features: ${features.join(",")}`);
  }
  const focal = f.focalCategories;
  if (Array.isArray(focal) && focal.length > 0) {
    parts.push(`Focal: ${focal.join(",")}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "(no filters)";
}

// Strip protocol + trailing slash from a URL for compact display.
// Keeps host + path so it still uniquely identifies the destination.
export function formatHref(href: string): string {
  return href
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

// Compact share method labels for the dashboard.
const SHARE_METHOD_LABELS: Record<string, string> = {
  copy_link: "Copy link",
  native: "Native share",
  poster_download: "Poster download",
  poster_share: "Poster share",
};

export function formatShareMethod(method: string): string {
  return SHARE_METHOD_LABELS[method] ?? method;
}
