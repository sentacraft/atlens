import { filterLenses, type FilterState } from "@/lib/lens/lens";
import { getLensesByMount, parseLensIds } from "@/lib/lens/data";
import { lensDisplayName } from "@/lib/lens/format";
import { lensRef } from "@/lib/ai/lens-ref";
import { urlSegmentToMount } from "@/lib/mount";
import { parseFilters } from "@/lib/url/filter-params";
import { COMPARE_IDS_PARAM, readCompareIds } from "@/lib/url/compare";
import type { Lens, Mount } from "@/lib/types";
import { routing } from "@/i18n/routing";

export interface PageLens {
  ref: string;
  name: string;
}

/** What the visitor is looking at when they ask, in the words the site shows them. */
export type PageContext =
  | { kind: "browse"; mount: Mount; filters: string[]; resultCount: number }
  | { kind: "compare"; mount: Mount; lenses: PageLens[] }
  | { kind: "lens"; mount: Mount; lens: PageLens };

export interface PageContextLabels {
  brand: (slug: string) => string;
  /** The `LensList` namespace, where the filter panel's labels live. */
  list: (key: string) => string;
  /** The `SpecialtyBadge` namespace, for optical traits. */
  badge: (key: string) => string;
}

const BROWSE_SEGMENTS = new Set(["browse", "collections", "compare"]);

/** Reads a page path the client sent (`/zh/lenses/x/compare?ids=…`); null for pages without lens context. */
export function resolvePageContext(path: string, locale: string, labels: PageContextLabels): PageContext | null {
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
    const filters = parseFilters(url.searchParams);
    return {
      kind: "browse",
      mount,
      filters: describeFilters(filters, labels),
      resultCount: filterLenses(getLensesByMount(mount, locale), filters).length,
    };
  }
  if (page === "compare") {
    const lenses = parseLensIds(readCompareIds(url.searchParams.get(COMPARE_IDS_PARAM) ?? undefined), mount, locale);
    return lenses.length > 0 ? { kind: "compare", mount, lenses: lenses.map((lens) => pageLens(lens, labels)) } : null;
  }
  if (BROWSE_SEGMENTS.has(page)) {
    return null;
  }
  const [lens] = parseLensIds([page], mount, locale);
  return lens ? { kind: "lens", mount, lens: pageLens(lens, labels) } : null;
}

/** The refs of the lenses on the page, which count as already looked up this turn. */
export function pageLensRefs(context: PageContext | null): string[] {
  if (context?.kind === "compare") {
    return context.lenses.map((lens) => lens.ref);
  }
  if (context?.kind === "lens") {
    return [context.lens.ref];
  }
  return [];
}

function pageLens(lens: Lens, labels: PageContextLabels): PageLens {
  return { ref: lensRef(lens.id), name: lensDisplayName(labels.brand(lens.brand), lens.series, lens.model) };
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

function describeFilters(filters: FilterState, labels: PageContextLabels): string[] {
  const { list, badge, brand } = labels;
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
