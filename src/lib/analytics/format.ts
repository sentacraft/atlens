import { getAllLenses } from "@/lib/lens/data";
import { lensDisplayName } from "@/lib/lens/format";

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

export function formatLensSlug(slug: string): string {
  return lensNameMap().get(slug) ?? slug;
}

export function formatLensSlugList(joined: string): string {
  if (!joined) {
    return "";
  }
  return joined
    .split(",")
    .map((s) => formatLensSlug(s.trim()))
    .join(" · ");
}

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
  if (f.usage === "cine") {
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

/** The most-used filter combinations, merging rows that show the same filters in different recorded shapes. */
export function topFilterSnapshots(
  rows: Array<{ filters_json?: unknown; n?: unknown }>,
  limit: number,
): Array<{ display: string; filters_json: string; n: number }> {
  const merged = new Map<string, { display: string; filters_json: string; n: number; largest: number }>();
  for (const row of rows) {
    const json = String(row.filters_json ?? "");
    const n = typeof row.n === "number" ? row.n : Number(row.n) || 0;
    const display = formatFilterSnapshot(json);
    const entry = merged.get(display);
    if (!entry) {
      merged.set(display, { display, filters_json: json, n, largest: n });
    } else {
      entry.n += n;
      if (n > entry.largest) {
        entry.filters_json = json;
        entry.largest = n;
      }
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map(({ display, filters_json, n }) => ({ display, filters_json, n }));
}

// Order is the tie-break.
const FILTER_DIMENSIONS: {
  label: string;
  isActive: (f: Record<string, unknown>) => boolean;
}[] = [
  { label: "Lens type (prime/zoom)", isActive: (f) => typeof f.typeFilter === "string" && !!f.typeFilter },
  { label: "Focus (AF/MF)", isActive: (f) => typeof f.focusFilter === "string" && !!f.focusFilter },
  { label: "Brand", isActive: (f) => Array.isArray(f.brands) && f.brands.length > 0 },
  // Recorded until late October 2026, when the lens library dropped its photo/cine switch.
  { label: "Usage (photo/cine)", isActive: (f) => f.usage === "cine" },
  { label: "Focal range", isActive: (f) => Array.isArray(f.focalCategories) && f.focalCategories.length > 0 },
  { label: "Focus motor", isActive: (f) => typeof f.focusMotorClass === "string" && !!f.focusMotorClass },
  { label: "Features", isActive: (f) => Array.isArray(f.features) && f.features.length > 0 },
  { label: "Optical trait", isActive: (f) => typeof f.opticalTrait === "string" && !!f.opticalTrait },
];

// A type, not an interface: interfaces lack the implicit index signature Table's prop needs.
export type FilterDimensionUsage = {
  dimension: string;
  n: number;
};

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

export function formatHref(href: string): string {
  return href
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}
