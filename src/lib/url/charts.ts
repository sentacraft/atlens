import { firstSearchParam } from "@/lib/url/search-params";

export const CHART_BRAND_PARAM = "brand";

/** The brand a chart page highlights (timeline) or filters by (weight ladder). */
export interface ChartSelection {
  brand?: string;
}

type ParamValue = string | string[] | undefined;

/** An unknown brand is dropped rather than rejected, so a stale link still opens the chart. */
export function readChartSelection(params: { [CHART_BRAND_PARAM]?: ParamValue }, knownBrands: readonly string[]): ChartSelection {
  const brand = firstSearchParam(params[CHART_BRAND_PARAM]);
  return { brand: brand && knownBrands.includes(brand) ? brand : undefined };
}

export function readChartSelectionFromSearch(search: URLSearchParams, knownBrands: readonly string[]): ChartSelection {
  return readChartSelection({ [CHART_BRAND_PARAM]: search.get(CHART_BRAND_PARAM) ?? undefined }, knownBrands);
}

/** A chart path opened with `selection` applied, for links from other pages. */
export function chartHref(path: string, selection: ChartSelection): string {
  const url = new URL(path, "https://x.invalid");
  writeChartSelection(url, selection);
  return `${url.pathname}${url.search}`;
}

/** Sets the selection param on `url` in place, leaving every other param alone. */
export function writeChartSelection(url: URL, selection: ChartSelection): void {
  url.searchParams.delete(CHART_BRAND_PARAM);
  if (selection.brand) {
    url.searchParams.set(CHART_BRAND_PARAM, selection.brand);
  }
}
