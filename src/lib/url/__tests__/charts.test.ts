import { describe, expect, it } from "vitest";
import { chartHighlightQuery, readChartHighlight } from "../charts";
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

describe("chartHighlightQuery", () => {
  it("round-trips through readChartHighlight", () => {
    const query = chartHighlightQuery({ brand: "sigma", focal: "standard" });
    expect(query).toBe("?brand=sigma&focal=standard");
    const params = Object.fromEntries(new URLSearchParams(query));
    expect(readChartHighlight(params, brands)).toEqual({ brand: "sigma", focal: "standard" });
  });

  it("is empty without a highlight", () => {
    expect(chartHighlightQuery({})).toBe("");
  });
});

describe("chart paths", () => {
  it("sit under the mount", () => {
    expect(chartsPath("X")).toBe("/lenses/x/charts");
    expect(chartPath("X", "weight")).toBe("/lenses/x/charts/weight");
    expect(lineupPath("X", "viltrox")).toBe("/lenses/x/charts/lineup/viltrox");
  });
});
