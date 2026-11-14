import { OPTICAL_TRAITS } from "@/lib/types";
import {
  APERTURE_FILTER_STOPS,
  defaultFilters,
  FILTER_FEATURE_KEYS,
  FOCAL_CATEGORIES,
  FOCUS_FILTERS,
  FOCUS_MOTOR_CLASSES,
  LENS_TYPES,
  SORT_KEYS,
  type FilterState,
  type FocalCategory,
} from "@/lib/lens/lens";
import { isOneOf, parsePositiveDecimal } from "@/lib/utils";

const FOCAL_KEYS = FOCAL_CATEGORIES.map((c) => c.key) as FocalCategory[];

export const FILTER_PARAM_KEYS = ["b", "t", "f", "ot", "m", "feat", "fc", "fmm", "fr", "ap", "w", "sort", "dir"] as const;
type FilterParamKey = (typeof FILTER_PARAM_KEYS)[number];

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
  if (filters.opticalTrait) {
    p.set("ot", filters.opticalTrait);
  }
  if (filters.focusMotorClass) {
    p.set("m", filters.focusMotorClass);
  }
  if (filters.features.length > 0) {
    p.set("feat", filters.features.join(","));
  }
  const focal = filters.focalLength;
  if (focal !== null && (focal.value === null || (Number.isFinite(focal.value) && focal.value > 0))) {
    p.set("fmm", focal.value === null ? "custom" : String(focal.value));
    p.set("fr", focal.reference);
  } else if (filters.focalCategories.length > 0) {
    p.set("fc", filters.focalCategories.join(","));
  }
  if (filters.maxAperture !== null && Number.isFinite(filters.maxAperture) && filters.maxAperture > 0) {
    p.set("ap", String(filters.maxAperture));
  }
  if (filters.weightLimit !== null && Number.isFinite(filters.weightLimit) && filters.weightLimit > 0) {
    p.set("w", String(filters.weightLimit));
  }
  if (filters.sort !== defaultFilters.sort) {
    p.set("sort", filters.sort);
  }
  if (filters.sortDir !== defaultFilters.sortDir) {
    p.set("dir", filters.sortDir);
  }
  return p;
}

export function writeFiltersToUrl(filters: FilterState): void {
  const url = new URL(window.location.href);
  FILTER_PARAM_KEYS.forEach((key) => url.searchParams.delete(key));
  const rest = url.searchParams.toString();
  const selected = serializeFilters(filters).toString().replace(/%2C/g, ",");
  url.search = [rest, selected].filter(Boolean).join("&");
  if (url.href !== window.location.href) {window.history.pushState(null, "", url);}
}

export function parseFilters(params: URLSearchParams): FilterState {
  const raw = Object.fromEntries(
    FILTER_PARAM_KEYS.map((k) => [k, params.get(k)]),
  ) as Record<FilterParamKey, string | null>;

  const focalValue = parsePositiveDecimal(raw.fmm);
  const focalLength: FilterState["focalLength"] = raw.fmm === "custom" || focalValue !== null
    ? { value: focalValue, reference: raw.fr === "actual" ? "actual" : "equivalent" }
    : null;
  const aperture = parsePositiveDecimal(raw.ap);

  return {
    brands: raw.b ? raw.b.split(",").filter(Boolean) : [],
    typeFilter: raw.t && isOneOf(raw.t, LENS_TYPES) ? raw.t : null,
    focusFilter: raw.f && isOneOf(raw.f, FOCUS_FILTERS) ? raw.f : null,
    opticalTrait: raw.ot && isOneOf(raw.ot, OPTICAL_TRAITS) ? raw.ot : null,
    focusMotorClass: raw.m && isOneOf(raw.m, FOCUS_MOTOR_CLASSES) ? raw.m : null,
    features: raw.feat ? raw.feat.split(",").filter((k) => isOneOf(k, FILTER_FEATURE_KEYS)) : [],
    focalCategories: focalLength === null && raw.fc ? raw.fc.split(",").filter((k) => isOneOf(k, FOCAL_KEYS)) : [],
    focalLength,
    maxAperture: aperture !== null && APERTURE_FILTER_STOPS.some((stop) => stop === aperture) ? aperture : null,
    weightLimit: parsePositiveDecimal(raw.w),
    sort: raw.sort && isOneOf(raw.sort, SORT_KEYS) ? raw.sort : defaultFilters.sort,
    sortDir: raw.dir === "desc" ? "desc" : "asc",
  };
}
