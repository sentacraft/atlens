import { MAX_COMPARE, type FilterState } from "@/lib/lens/lens";
import { urlSegmentToMount } from "@/lib/mount";
import { parseFilters } from "@/lib/url/filter-params";
import { COMPARE_IDS_PARAM, readCompareIds } from "@/lib/url/compare";
import type { Mount } from "@/lib/types";
import { routing } from "@/i18n/routing";
import type { NamespaceTranslator } from "@/i18n/translator";

/** A page whose lenses or filters Iris's example questions can name, read from its path. Lens ids are unchecked: callers look them up. */
export type PageRef =
  | { kind: "browse"; mount: Mount; filters: FilterState }
  | { kind: "compare"; mount: Mount; lensIds: string[] }
  | { kind: "lens"; mount: Mount; lensId: string };

const NOT_A_LENS = new Set(["browse", "collections", "compare"]);

/** Reads a path like `/zh/lenses/x/compare?ids=a,b`; null for pages without lens context. */
export function parsePagePath(path: string): PageRef | null {
  let url: URL;
  try {
    url = new URL(path, "https://page.invalid");
  } catch {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if ((routing.locales as readonly string[]).includes(segments[0])) {
    segments.shift();
  }
  if (segments[0] !== "lenses" || segments.length !== 3) {
    return null;
  }
  const mount = urlSegmentToMount(segments[1]);
  if (!mount) {
    return null;
  }
  const page = segments[2];
  if (page === "browse") {
    return { kind: "browse", mount, filters: parseFilters(url.searchParams) };
  }
  if (page === "compare") {
    const lensIds = readCompareIds(url.searchParams.get(COMPARE_IDS_PARAM) ?? undefined).slice(0, MAX_COMPARE);
    return lensIds.length > 0 ? { kind: "compare", mount, lensIds } : null;
  }
  return NOT_A_LENS.has(page) ? null : { kind: "lens", mount, lensId: page };
}

interface FilterLabels {
  brand: (slug: string) => string;
  list: NamespaceTranslator<"LensList">;
  badge: NamespaceTranslator<"SpecialtyBadge">;
}

const FOCUS_LABEL = { auto: "focusAuto", manual: "focusManual" } as const;
const TYPE_LABEL = { prime: "primes", zoom: "zooms" } as const;
const FEATURE_LABEL = {
  ois: "featureOis",
  wr: "featureWr",
  apertureRing: "featureApertureRing",
  powerZoom: "featurePowerZoom",
  internalZoom: "featureInternalZoom",
} as const;
const MOTOR_LABEL = { linear: "motorLinear", stepping: "motorStepping", dc: "motorDc", other: "motorOther" } as const;

/** The active filters in the filter panel's own words. */
export function describeFilters(filters: FilterState, { list, badge, brand }: FilterLabels): string[] {
  return [
    filters.usage === "cine" ? list("usageCine") : undefined,
    filters.brands.length > 0 ? filters.brands.map(brand).join(" / ") : undefined,
    filters.typeFilter ? list(TYPE_LABEL[filters.typeFilter]) : undefined,
    filters.focusFilter ? list(FOCUS_LABEL[filters.focusFilter]) : undefined,
    filters.focalCategories.length > 0
      ? filters.focalCategories.map((key) => list(`category-${key}`)).join(" / ")
      : undefined,
    ...filters.features.map((key) => list(FEATURE_LABEL[key])),
    filters.opticalTrait ? badge(filters.opticalTrait) : undefined,
    filters.focusMotorClass ? list(MOTOR_LABEL[filters.focusMotorClass]) : undefined,
  ].filter((label): label is string => Boolean(label));
}
