import { describe, expect, it } from "vitest";
import { readChartHighlight, readChartHighlightFromSearch, writeChartHighlight } from "../charts";
import { chartPath, chartsPath, lineupPath } from "../routes";

const brands = ["fujifilm", "sigma"];

describe("readChartHighlight", () => {
  it("reads a known brand and focal category", () => {
    expect(readChartHighlight({ brand: "sigma", focal: "wide" }, brands)).toEqual({ brand: "sigma", focal: "wide" });
  });

  it("drops values the chart cannot show instead of failing", () => {
    expect(readChartHighlight({ brand: "canon", focal: "fisheye" }, brands)).toEqual({});
  });

  it("takes the first of a repeated param", () => {
    expect(readChartHighlight({ brand: ["sigma", "fujifilm"] }, brands).brand).toBe("sigma");
  });
});

describe("writeChartHighlight", () => {
  it("round-trips through the URL and leaves other params alone", () => {
    const url = new URL("https://atlens.test/en/lenses/x/charts/weight?ref=share&brand=fujifilm");
    writeChartHighlight(url, { brand: "sigma", focal: "standard" });
    expect(url.searchParams.get("ref")).toBe("share");
    expect(readChartHighlightFromSearch(url.searchParams, brands)).toEqual({ brand: "sigma", focal: "standard" });
  });

  it("removes the params when the highlight is cleared", () => {
    const url = new URL("https://atlens.test/en/lenses/x/charts/weight?brand=sigma&focal=wide");
    writeChartHighlight(url, {});
    expect(url.search).toBe("");
  });
});

describe("chart paths", () => {
  it("sit under the mount", () => {
    expect(chartsPath("X")).toBe("/lenses/x/charts");
    expect(chartPath("X", "weight")).toBe("/lenses/x/charts/weight");
    expect(lineupPath("X", "viltrox")).toBe("/lenses/x/charts/lineup/viltrox");
  });
});
