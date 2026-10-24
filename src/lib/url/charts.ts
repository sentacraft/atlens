import { firstSearchParam } from "@/lib/url/search-params";

export const CHART_BRAND_PARAM = "brand";
export const CHART_LENS_PARAM = "lens";

/** What a chart page applies: a brand it highlights (timeline) or filters by (weight ladder), and a lens it scrolls to and marks. */
export interface ChartSelection {
  brand?: string;
  lens?: string;
}

/** The brands and lenses a chart can show; anything else in the URL is ignored. */
export interface ChartKnown {
  brands: readonly string[];
  lenses: readonly string[];
}

type ParamValue = string | string[] | undefined;

/** An unknown brand or lens is dropped rather than rejected, so a stale link still opens the chart. */
export function readChartSelection(
  params: { [CHART_BRAND_PARAM]?: ParamValue; [CHART_LENS_PARAM]?: ParamValue },
  known: ChartKnown,
): ChartSelection {
  const brand = firstSearchParam(params[CHART_BRAND_PARAM]);
  const lens = firstSearchParam(params[CHART_LENS_PARAM]);
  return {
    brand: brand && known.brands.includes(brand) ? brand : undefined,
    lens: lens && known.lenses.includes(lens) ? lens : undefined,
  };
}

export function readChartSelectionFromSearch(search: URLSearchParams, known: ChartKnown): ChartSelection {
  return readChartSelection(
    { [CHART_BRAND_PARAM]: search.get(CHART_BRAND_PARAM) ?? undefined, [CHART_LENS_PARAM]: search.get(CHART_LENS_PARAM) ?? undefined },
    known,
  );
}

/** A chart path opened with `selection` applied, for links from other pages. */
export function chartHref(path: string, selection: ChartSelection): string {
  const url = new URL(path, "https://x.invalid");
  writeChartSelection(url, selection);
  return `${url.pathname}${url.search}`;
}

/** Sets the selection params on `url` in place, leaving every other param alone. */
export function writeChartSelection(url: URL, selection: ChartSelection): void {
  for (const [param, value] of [
    [CHART_BRAND_PARAM, selection.brand],
    [CHART_LENS_PARAM, selection.lens],
  ] as const) {
    url.searchParams.delete(param);
    if (value) {
      url.searchParams.set(param, value);
    }
  }
}
