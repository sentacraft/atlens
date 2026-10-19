import { firstSearchParam } from "@/lib/url/search-params";
import { ADMIN_ANALYTICS_PATH } from "@/lib/url/routes";

export const ADMIN_ANALYTICS_PARAMS = { range: "range" } as const;

export const ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = "30d";

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All time",
};

/** The dashboard's pages; the empty segment is the overview at the dashboard's own path. */
export const ANALYTICS_TABS = [
  { segment: "", label: "Overview" },
  { segment: "discovery", label: "Discovery" },
  { segment: "conversion", label: "Conversion" },
  { segment: "iris", label: "Ask Iris" },
  { segment: "accounts", label: "Accounts & more" },
] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]["segment"];

export function resolveAnalyticsRange(params: Record<string, string | string[] | undefined>): AnalyticsRange {
  return parseAnalyticsRange(firstSearchParam(params[ADMIN_ANALYTICS_PARAMS.range]));
}

export function parseAnalyticsRange(value: string | null | undefined): AnalyticsRange {
  return ANALYTICS_RANGES.find((range) => range === value) ?? DEFAULT_ANALYTICS_RANGE;
}

/** The tab a dashboard pathname shows, or null outside the dashboard. */
export function analyticsTabOf(pathname: string): AnalyticsTab | null {
  if (pathname === ADMIN_ANALYTICS_PATH) {
    return "";
  }
  const segment = pathname.startsWith(`${ADMIN_ANALYTICS_PATH}/`) ? pathname.slice(ADMIN_ANALYTICS_PATH.length + 1) : null;
  return ANALYTICS_TABS.find((tab) => tab.segment !== "" && tab.segment === segment)?.segment ?? null;
}

export function adminAnalyticsPath(tab: AnalyticsTab, range: AnalyticsRange): string {
  const path = tab ? `${ADMIN_ANALYTICS_PATH}/${tab}` : ADMIN_ANALYTICS_PATH;
  return range === DEFAULT_ANALYTICS_RANGE ? path : `${path}?${ADMIN_ANALYTICS_PARAMS.range}=${range}`;
}
