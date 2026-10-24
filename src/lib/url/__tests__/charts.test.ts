import { describe, expect, it } from "vitest";
import { chartHref, readChartSelection, readChartSelectionFromSearch, writeChartSelection } from "../charts";
import { brandPath, chartPath, chartsPath } from "../routes";

const known = { brands: ["fujifilm", "sigma"], lenses: ["xf-56mm"] };

describe("readChartSelection", () => {
  it("reads a known brand", () => {
    expect(readChartSelection({ brand: "sigma" }, known)).toEqual({ brand: "sigma", lens: undefined });
  });

  it("drops a brand the chart cannot show instead of failing", () => {
    expect(readChartSelection({ brand: "canon" }, known)).toEqual({ brand: undefined, lens: undefined });
  });

  it("reads a known lens and drops an unknown one", () => {
    expect(readChartSelection({ lens: "xf-56mm" }, known)).toEqual({ brand: undefined, lens: "xf-56mm" });
    expect(readChartSelection({ lens: "gone" }, known).lens).toBeUndefined();
  });

  it("takes the first of a repeated param", () => {
    expect(readChartSelection({ brand: ["sigma", "fujifilm"] }, known).brand).toBe("sigma");
  });
});

describe("writeChartSelection", () => {
  it("round-trips through the URL and leaves other params alone", () => {
    const url = new URL("https://atlens.test/en/lenses/x/charts/weight?ref=share&brand=fujifilm");
    writeChartSelection(url, { brand: "sigma", lens: "xf-56mm" });
    expect(url.searchParams.get("ref")).toBe("share");
    expect(readChartSelectionFromSearch(url.searchParams, known)).toEqual({ brand: "sigma", lens: "xf-56mm" });
  });

  it("removes the param when the selection is cleared", () => {
    const url = new URL("https://atlens.test/en/lenses/x/charts/weight?brand=sigma");
    writeChartSelection(url, {});
    expect(url.search).toBe("");
  });
});

describe("chartHref", () => {
  it("opens a chart with a brand highlighted", () => {
    expect(chartHref("/lenses/x/charts/timeline", { brand: "sigma" })).toBe("/lenses/x/charts/timeline?brand=sigma");
    expect(chartHref("/lenses/x/charts/timeline", {})).toBe("/lenses/x/charts/timeline");
    expect(chartHref("/lenses/x/charts/weight", { lens: "xf-56mm" })).toBe("/lenses/x/charts/weight?lens=xf-56mm");
  });
});

describe("chart paths", () => {
  it("sit under the mount", () => {
    expect(chartsPath("X")).toBe("/lenses/x/charts");
    expect(chartPath("X", "weight")).toBe("/lenses/x/charts/weight");
    expect(brandPath("X", "viltrox")).toBe("/lenses/x/brands/viltrox");
  });
});
