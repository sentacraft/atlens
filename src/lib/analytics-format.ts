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
  if (typeof f.opticalTrait === "string" && f.opticalTrait) {
    parts.push(`Trait: ${f.opticalTrait}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "(no filters)";
}

// One filter dimension and the predicate that decides whether a snapshot has
// it active (non-default). Order here is the display fallback when counts tie.
const FILTER_DIMENSIONS: {
  label: string;
  isActive: (f: Record<string, unknown>) => boolean;
}[] = [
  { label: "Lens type (prime/zoom)", isActive: (f) => typeof f.typeFilter === "string" && !!f.typeFilter },
  { label: "Focus (AF/MF)", isActive: (f) => typeof f.focusFilter === "string" && !!f.focusFilter },
  { label: "Brand", isActive: (f) => Array.isArray(f.brands) && f.brands.length > 0 },
  { label: "Usage (photo/cine)", isActive: (f) => typeof f.usage === "string" && f.usage !== defaultFilters.usage },
  { label: "Focal range", isActive: (f) => Array.isArray(f.focalCategories) && f.focalCategories.length > 0 },
  { label: "Focus motor", isActive: (f) => typeof f.focusMotorClass === "string" && !!f.focusMotorClass },
  { label: "Features", isActive: (f) => Array.isArray(f.features) && f.features.length > 0 },
  { label: "Optical trait", isActive: (f) => typeof f.opticalTrait === "string" && !!f.opticalTrait },
];

// A `type` (not `interface`) so the row is assignable to the dashboard
// Table's `Record<string, unknown>[]` prop — interfaces are treated as
// open/augmentable and lack the implicit index signature.
export type FilterDimensionUsage = {
  dimension: string;
  n: number;
};

// The "most-used snapshots" card groups by the whole filter combo, so a
// filter used across many different combos never accumulates into a visible
// row. This decomposes each snapshot and tallies how often every individual
// filter dimension was active — answering "how many applies touched filter X"
// rather than "what's the most common full combo". `n` is the per-combo
// apply weight (SUM(_sample_interval)) that the caller already aggregated.
export function aggregateFilterDimensions(
  rows: Array<{ filters?: unknown; n?: unknown }>,
): FilterDimensionUsage[] {
  const totals = new Map<string, number>(FILTER_DIMENSIONS.map((d) => [d.label, 0]));
  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(row.filters ?? ""));
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") {
      continue;
    }
    const f = parsed as Record<string, unknown>;
    const weight = typeof row.n === "number" ? row.n : Number(row.n) || 0;
    for (const dim of FILTER_DIMENSIONS) {
      if (dim.isActive(f)) {
        totals.set(dim.label, (totals.get(dim.label) ?? 0) + weight);
      }
    }
  }
  return FILTER_DIMENSIONS
    .map((d) => ({ dimension: d.label, n: totals.get(d.label) ?? 0 }))
    .sort((a, b) => b.n - a.n);
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
