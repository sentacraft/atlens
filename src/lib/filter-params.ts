import { SPECIALTY_TAGS } from "./types";
import type { SpecialtyTag } from "./types";
import {
  defaultFilters,
  FILTER_FEATURE_KEYS,
  FOCAL_CATEGORIES,
  type FilterState,
  type FilterFeatureKey,
  type FocalCategory,
  type FocusFilter,
  type FocusMotorClass,
  type LensType,
  type SortKey,
} from "./lens";

const FOCAL_KEYS = FOCAL_CATEGORIES.map((c) => c.key) as FocalCategory[];
const MOTOR_CLASSES: FocusMotorClass[] = ["linear", "stepping", "other"];
const LENS_TYPES: LensType[] = ["prime", "zoom"];
const FOCUS_FILTERS: FocusFilter[] = ["auto", "manual"];
const SORT_KEYS: SortKey[] = ["focalLength", "maxAperture", "weightG"];

// Compact param keys — only non-default values are serialized.
// b=brands, t=typeFilter, f=focusFilter, st=specialtyTag, m=focusMotorClass,
// feat=features, fc=focalCategories, sort=sortKey, dir=sortDir
export function serializeFilters(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.brands.length > 0) p.set("b", filters.brands.join(","));
  if (filters.typeFilter) p.set("t", filters.typeFilter);
  if (filters.focusFilter) p.set("f", filters.focusFilter);
  if (filters.specialtyTag) p.set("st", filters.specialtyTag);
  if (filters.focusMotorClass) p.set("m", filters.focusMotorClass);
  if (filters.features.length > 0) p.set("feat", filters.features.join(","));
  if (filters.focalCategories.length > 0) p.set("fc", filters.focalCategories.join(","));
  if (filters.sort !== defaultFilters.sort) p.set("sort", filters.sort);
  if (filters.sortDir !== defaultFilters.sortDir) p.set("dir", filters.sortDir);
  return p;
}

export function parseFilters(params: URLSearchParams | { get: (key: string) => string | null }): FilterState {
  const raw = {
    b: params.get("b"),
    t: params.get("t"),
    f: params.get("f"),
    st: params.get("st"),
    m: params.get("m"),
    feat: params.get("feat"),
    fc: params.get("fc"),
    sort: params.get("sort"),
    dir: params.get("dir"),
  };

  return {
    brands: raw.b ? raw.b.split(",").filter(Boolean) : [],
    typeFilter: raw.t && LENS_TYPES.includes(raw.t as LensType) ? (raw.t as LensType) : null,
    focusFilter: raw.f && FOCUS_FILTERS.includes(raw.f as FocusFilter) ? (raw.f as FocusFilter) : null,
    specialtyTag: raw.st && (SPECIALTY_TAGS as readonly string[]).includes(raw.st) ? (raw.st as SpecialtyTag) : null,
    focusMotorClass: raw.m && MOTOR_CLASSES.includes(raw.m as FocusMotorClass) ? (raw.m as FocusMotorClass) : null,
    features: raw.feat
      ? (raw.feat.split(",").filter((k) => (FILTER_FEATURE_KEYS as readonly string[]).includes(k)) as FilterFeatureKey[])
      : [],
    focalCategories: raw.fc
      ? (raw.fc.split(",").filter((k) => (FOCAL_KEYS as readonly string[]).includes(k)) as FocalCategory[])
      : [],
    sort: raw.sort && SORT_KEYS.includes(raw.sort as SortKey) ? (raw.sort as SortKey) : defaultFilters.sort,
    sortDir: raw.dir === "desc" ? "desc" : "asc",
  };
}
