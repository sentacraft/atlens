import { FOCAL_CATEGORIES, type FocalCategory } from "@/lib/lens/lens";
import { firstSearchParam } from "@/lib/url/search-params";

export const CHART_BRAND_PARAM = "brand";
export const CHART_FOCAL_PARAM = "focal";

/** What a chart page emphasizes; the chart itself always shows every lens. */
export interface ChartHighlight {
  brand?: string;
  focal?: FocalCategory;
}

type ParamValue = string | string[] | undefined;

/** Unknown brands and categories are dropped rather than rejected, so a stale link still opens the chart. */
export function readChartHighlight(
  params: { [CHART_BRAND_PARAM]?: ParamValue; [CHART_FOCAL_PARAM]?: ParamValue },
  knownBrands: readonly string[],
): ChartHighlight {
  const brand = firstSearchParam(params[CHART_BRAND_PARAM]);
  const focal = firstSearchParam(params[CHART_FOCAL_PARAM]);
  return {
    brand: brand && knownBrands.includes(brand) ? brand : undefined,
    focal: FOCAL_CATEGORIES.find((c) => c.key === focal)?.key,
  };
}

export function chartHighlightQuery(highlight: ChartHighlight): string {
  const params = new URLSearchParams();
  if (highlight.brand) {
    params.set(CHART_BRAND_PARAM, highlight.brand);
  }
  if (highlight.focal) {
    params.set(CHART_FOCAL_PARAM, highlight.focal);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
