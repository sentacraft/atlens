import { OPTICAL_TRAITS } from "@/lib/types";
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
} from "@/lib/lens/lens";
import { isOneOf } from "@/lib/utils";

const FOCAL_KEYS = FOCAL_CATEGORIES.map((c) => c.key) as FocalCategory[];

// Every URL query key the filter state owns — the single list a URL-sync writer
// deletes before re-writing, so it touches only its own params and leaves
// foreign ones (utm, …) intact. Must stay in step with serializeFilters below
// (asserted by a test).
export const FILTER_PARAM_KEYS = ["b", "t", "f", "u", "ot", "m", "feat", "fc", "sort", "dir"] as const;
type FilterParamKey = (typeof FILTER_PARAM_KEYS)[number];

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

export function parseFilters(params: URLSearchParams): FilterState {
  // Object.fromEntries widens the key type back to string, so re-narrow it so
  // the per-key access below (raw.b, raw.t, …) still type-checks.
  const raw = Object.fromEntries(
    FILTER_PARAM_KEYS.map((k) => [k, params.get(k)]),
  ) as Record<FilterParamKey, string | null>;

  return {
    brands: raw.b ? raw.b.split(",").filter(Boolean) : [],
    typeFilter: raw.t && isOneOf(raw.t, LENS_TYPES) ? raw.t : null,
    focusFilter: raw.f && isOneOf(raw.f, FOCUS_FILTERS) ? raw.f : null,
    // Legacy `?u=all` (the removed union view) and unknown tokens fall back to photo.
    usage: raw.u && isOneOf(raw.u, USAGE_VALUES) ? raw.u : defaultFilters.usage,
    opticalTrait: raw.ot && isOneOf(raw.ot, OPTICAL_TRAITS) ? raw.ot : null,
    focusMotorClass: raw.m && isOneOf(raw.m, FOCUS_MOTOR_CLASSES) ? raw.m : null,
    features: raw.feat ? raw.feat.split(",").filter((k) => isOneOf(k, FILTER_FEATURE_KEYS)) : [],
    focalCategories: raw.fc ? raw.fc.split(",").filter((k) => isOneOf(k, FOCAL_KEYS)) : [],
    sort: raw.sort && isOneOf(raw.sort, SORT_KEYS) ? raw.sort : defaultFilters.sort,
    sortDir: raw.dir === "desc" ? "desc" : "asc",
  };
}
