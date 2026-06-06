import { OPTICAL_TRAITS } from "./types";
import {
  defaultFilters,
  FILTER_FEATURE_KEYS,
  FOCAL_CATEGORIES,
  FOCUS_FILTERS,
  FOCUS_MOTOR_CLASSES,
  LENS_TYPES,
  SORT_KEYS,
  USAGE_VALUES,
  type FilterState,
  type FocalCategory,
  type UsageFilter,
} from "./lens";
import { isOneOf } from "./utils";

const FOCAL_KEYS = FOCAL_CATEGORIES.map((c) => c.key) as FocalCategory[];

// Compact param keys — only non-default values are serialized.
// b=brands, t=typeFilter, f=focusFilter, u=usage, m=focusMotorClass,
// feat=features, fc=focalCategories, sort=sortKey, dir=sortDir
//
// Usage default is "photo", so it is serialized only when the user picks "cine".
export function serializeFilters(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.brands.length > 0) {
    p.set("b", filters.brands.join(","));
  }
  if (filters.typeFilter) {
    p.set("t", filters.typeFilter);
  }
  if (filters.focusFilter) {
    p.set("f", filters.focusFilter);
  }
  if (filters.usage !== defaultFilters.usage) {
    p.set("u", filters.usage);
  }
  if (filters.opticalTrait) {
    p.set("ot", filters.opticalTrait);
  }
  if (filters.focusMotorClass) {
    p.set("m", filters.focusMotorClass);
  }
  if (filters.features.length > 0) {
    p.set("feat", filters.features.join(","));
  }
  if (filters.focalCategories.length > 0) {
    p.set("fc", filters.focalCategories.join(","));
  }
  if (filters.sort !== defaultFilters.sort) {
    p.set("sort", filters.sort);
  }
  if (filters.sortDir !== defaultFilters.sortDir) {
    p.set("dir", filters.sortDir);
  }
  return p;
}

function parseUsage(raw: string | null): UsageFilter {
  // Legacy `?u=all` (the removed union view) and any unknown token fall back
  // to the default photo view.
  return raw && isOneOf(raw, USAGE_VALUES) ? raw : defaultFilters.usage;
}

export function parseFilters(params: URLSearchParams): FilterState {
  const raw = {
    b: params.get("b"),
    t: params.get("t"),
    f: params.get("f"),
    u: params.get("u"),
    ot: params.get("ot"),
    m: params.get("m"),
    feat: params.get("feat"),
    fc: params.get("fc"),
    sort: params.get("sort"),
    dir: params.get("dir"),
  };

  return {
    brands: raw.b ? raw.b.split(",").filter(Boolean) : [],
    typeFilter: raw.t && isOneOf(raw.t, LENS_TYPES) ? raw.t : null,
    focusFilter: raw.f && isOneOf(raw.f, FOCUS_FILTERS) ? raw.f : null,
    usage: parseUsage(raw.u),
    opticalTrait: raw.ot && isOneOf(raw.ot, OPTICAL_TRAITS) ? raw.ot : null,
    focusMotorClass: raw.m && isOneOf(raw.m, FOCUS_MOTOR_CLASSES) ? raw.m : null,
    features: raw.feat ? raw.feat.split(",").filter((k) => isOneOf(k, FILTER_FEATURE_KEYS)) : [],
    focalCategories: raw.fc ? raw.fc.split(",").filter((k) => isOneOf(k, FOCAL_KEYS)) : [],
    sort: raw.sort && isOneOf(raw.sort, SORT_KEYS) ? raw.sort : defaultFilters.sort,
    sortDir: raw.dir === "desc" ? "desc" : "asc",
  };
}
