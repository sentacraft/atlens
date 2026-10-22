import { FOCAL_CATEGORIES, type FocalCategory } from "@/lib/lens/lens";
import { firstSearchParam } from "@/lib/url/search-params";

export const CHART_BRAND_PARAM = "brand";
export const CHART_FOCAL_PARAM = "focal";

/** The brand and focal range a chart page highlights (timeline) or filters by (weight ladder). */
export interface ChartSelection {
  brand?: string;
  focal?: FocalCategory;
}

type ParamValue = string | string[] | undefined;

/** Unknown brands and categories are dropped rather than rejected, so a stale link still opens the chart. */
export function readChartSelection(
  params: { [CHART_BRAND_PARAM]?: ParamValue; [CHART_FOCAL_PARAM]?: ParamValue },
  knownBrands: readonly string[],
): ChartSelection {
  const brand = firstSearchParam(params[CHART_BRAND_PARAM]);
  const focal = firstSearchParam(params[CHART_FOCAL_PARAM]);
  return {
    brand: brand && knownBrands.includes(brand) ? brand : undefined,
    focal: FOCAL_CATEGORIES.find((c) => c.key === focal)?.key,
  };
}

export function readChartSelectionFromSearch(search: URLSearchParams, knownBrands: readonly string[]): ChartSelection {
  return readChartSelection(
    {
      [CHART_BRAND_PARAM]: search.get(CHART_BRAND_PARAM) ?? undefined,
      [CHART_FOCAL_PARAM]: search.get(CHART_FOCAL_PARAM) ?? undefined,
    },
    knownBrands,
  );
}

/** Sets the selection params on `url` in place, leaving every other param alone. */
export function writeChartSelection(url: URL, highlight: ChartSelection): void {
  url.searchParams.delete(CHART_BRAND_PARAM);
  url.searchParams.delete(CHART_FOCAL_PARAM);
  if (highlight.brand) {
    url.searchParams.set(CHART_BRAND_PARAM, highlight.brand);
  }
  if (highlight.focal) {
    url.searchParams.set(CHART_FOCAL_PARAM, highlight.focal);
  }
}
