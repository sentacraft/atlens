import { describe, expect, it } from "vitest";
import { buildLineup } from "@/lib/charts/lineup";
import { lineupListGroups, timelineListGroups } from "@/lib/charts/list";
import { buildTimeline } from "@/lib/charts/timeline";
import { lensModelName } from "@/lib/lens/format";
import type { Lens } from "@/lib/types";

function makeLens(overrides: Partial<Lens> = {}): Lens {
  return {
    id: "test-lens", brand: "fujifilm", mount: "X", model: "Test Lens", officialLinks: {},
    focalLengthMin: 35, focalLengthMax: 35, maxAperture: 2, minAperture: 16, af: true, ois: false, wr: false,
    apertureRing: false, powerZoom: false, internalZoom: false, weightG: 170, diameterMm: 60, length: { mm: 46 },
    angleOfViewCalc: 44, searchAliases: { store: { en: "Test Lens" }, review: { en: "Test Lens" } },
    ...overrides,
  };
}

describe("timelineListGroups", () => {
  const timeline = buildTimeline([
    makeLens({ id: "sigma-56", brand: "sigma", focalLengthMin: 56, focalLengthMax: 56, releaseYear: 2020 }),
    makeLens({ id: "fuji-90", brand: "fujifilm", focalLengthMin: 90, focalLengthMax: 90, releaseYear: 2020 }),
    makeLens({ id: "fuji-16", brand: "fujifilm", focalLengthMin: 16, focalLengthMax: 16, releaseYear: 2020 }),
    makeLens({ id: "fuji-23", brand: "fujifilm", focalLengthMin: 23, focalLengthMax: 23, releaseYear: 2020 }),
    makeLens({ id: "old", brand: "sigma", releaseYear: 2018 }),
  ]);

  it("groups by year, newest first, each line showing its brand and no year", () => {
    const groups = timelineListGroups(timeline);
    expect(groups.map(({ key }) => key)).toEqual(["2020", "2018"]);
    expect(groups[0].lines.every((line) => line.showBrand && line.year === undefined)).toBe(true);
  });

  it("sorts a year by the chart's brand order, then by focal length", () => {
    const [year2020] = timelineListGroups(timeline);
    // Fujifilm has more dated lenses than Sigma, so it comes first.
    expect(year2020.lines.map(({ lens }) => lens.id)).toEqual(["fuji-16", "fuji-23", "fuji-90", "sigma-56"]);
  });
});

describe("lineupListGroups", () => {
  const lineup = buildLineup([
    makeLens({ id: "zoom", focalLengthMin: 16, focalLengthMax: 55, releaseYear: 2015 }),
    makeLens({ id: "prime", focalLengthMin: 23, focalLengthMax: 23 }),
  ], "fujifilm")!;

  it("groups by brand in the chart's order, lines without the brand and with the release year", () => {
    const [group] = lineupListGroups([lineup]);
    expect(group.key).toBe("fujifilm");
    expect(group.lines.map(({ lens }) => lens.id)).toEqual(["prime", "zoom"]);
    expect(group.lines.every((line) => !line.showBrand)).toBe(true);
    expect(group.lines.map((line) => line.year)).toEqual([undefined, 2015]);
  });
});

describe("lensModelName", () => {
  it("joins the series and model, leaving out a series the model already names", () => {
    expect(lensModelName("Contemporary", "15mm F1.4 DC")).toBe("Contemporary 15mm F1.4 DC");
    expect(lensModelName("Contemporary", "15mm F1.4 DC | Contemporary")).toBe("15mm F1.4 DC | Contemporary");
    expect(lensModelName(undefined, "XF 23mm F1.4 R")).toBe("XF 23mm F1.4 R");
  });
});
