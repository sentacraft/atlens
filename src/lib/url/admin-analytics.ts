import { firstSearchParam } from "@/lib/url/search-params";
import { ADMIN_ANALYTICS_PATH } from "@/lib/url/routes";

export const ADMIN_ANALYTICS_PARAMS = { range: "range" } as const;

export const ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = "30d";

export function resolveAnalyticsRange(params: Record<string, string | string[] | undefined>): AnalyticsRange {
  const value = firstSearchParam(params[ADMIN_ANALYTICS_PARAMS.range]);
  return ANALYTICS_RANGES.find((range) => range === value) ?? DEFAULT_ANALYTICS_RANGE;
}

export function adminAnalyticsPath(range: AnalyticsRange): string {
  return range === DEFAULT_ANALYTICS_RANGE
    ? ADMIN_ANALYTICS_PATH
    : `${ADMIN_ANALYTICS_PATH}?${ADMIN_ANALYTICS_PARAMS.range}=${range}`;
}
