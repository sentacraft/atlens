import { describe, expect, it } from "vitest";
import { chartHref, readChartSelection, readChartSelectionFromSearch, writeChartSelection } from "../charts";
import { brandPath, chartPath, chartsPath } from "../routes";

const brands = ["fujifilm", "sigma"];

describe("readChartSelection", () => {
  it("reads a known brand", () => {
    expect(readChartSelection({ brand: "sigma" }, brands)).toEqual({ brand: "sigma" });
  });

  it("drops a brand the chart cannot show instead of failing", () => {
    expect(readChartSelection({ brand: "canon" }, brands)).toEqual({ brand: undefined });
  });

  it("takes the first of a repeated param", () => {
    expect(readChartSelection({ brand: ["sigma", "fujifilm"] }, brands).brand).toBe("sigma");
  });
});

describe("writeChartSelection", () => {
  it("round-trips through the URL and leaves other params alone", () => {
    const url = new URL("https://atlens.test/en/lenses/x/charts/weight?ref=share&brand=fujifilm");
    writeChartSelection(url, { brand: "sigma" });
    expect(url.searchParams.get("ref")).toBe("share");
    expect(readChartSelectionFromSearch(url.searchParams, brands)).toEqual({ brand: "sigma" });
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
  });
});

describe("chart paths", () => {
  it("sit under the mount", () => {
    expect(chartsPath("X")).toBe("/lenses/x/charts");
    expect(chartPath("X", "weight")).toBe("/lenses/x/charts/weight");
    expect(brandPath("X", "viltrox")).toBe("/lenses/x/brands/viltrox");
  });
});
