import { defaultFilters } from "@/lib/lens/lens";
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

// Order is the tie-break.
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

const SHARE_METHOD_LABELS: Record<string, string> = {
  copy_link: "Copy link",
  native: "Native share",
  poster_download: "Poster download",
  poster_share: "Poster share",
};

export function formatShareMethod(method: string): string {
  return SHARE_METHOD_LABELS[method] ?? method;
}
