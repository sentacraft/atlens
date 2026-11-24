import { describe, it, expect } from "vitest";
import { groupMtfCharts, type MtfChart } from "../mtf-comparison";
import type { LensImageAsset } from "@/lib/types";

const chart = (lensRef: string, maxAperture: MtfChart["maxAperture"], image: Partial<LensImageAsset>, zoom = false, name = `${lensRef}-fig`): MtfChart => ({
  lensRef, zoom, maxAperture, name, image: { id: "001", role: "mtf", ...image },
});

const f15_45 = { values: [15, 45], unit: "lines/mm" as const };
const f10_30 = { values: [10, 30], unit: "lines/mm" as const };

describe("groupMtfCharts", () => {
  it("puts two lenses on the same scale in one group with the unstated-aperture caveat", () => {
    const result = groupMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }, true, "图 1"),
      chart("b", 4, { spatialFrequency: f15_45, focalLengthMm: 16 }, true, "图 2"),
    ]);
    expect(result?.mtfGroups).toHaveLength(1);
    expect(result?.betweenGroups).toBeUndefined();
    const [group] = result!.mtfGroups;
    expect(group.level).toBe("values-with-caveats");
    expect(group.lenses).toEqual([{ lens: "a", charts: ["图 1"] }, { lens: "b", charts: ["图 2"] }]);
    const aperture = group.caveats.find((text) => text.includes("test aperture"));
    expect(aperture).toContain("f/2.8");
    expect(aperture).toContain("f/4");
  });

  it("grades matching conditions as values with no caveats", () => {
    const common = { spatialFrequency: f15_45, apertureFNumbers: [4] };
    const result = groupMtfCharts([chart("a", 4, common), chart("b", 4, common)]);
    expect(result?.mtfGroups[0]).toMatchObject({ level: "values", caveats: [] });
  });

  it("names differing test apertures and a zoom's unstated focal length", () => {
    const result = groupMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45, apertureFNumbers: [2.8] }, true),
      chart("b", [3.5, 5.6], { spatialFrequency: f15_45, apertureFNumbers: [8], conditionsNote: "Wide-angle end" }, true),
    ]);
    const caveats = result!.mtfGroups[0].caveats.join(" ");
    expect(caveats).toContain("f/8");
    expect(caveats).toContain("focal length");
  });

  it("splits four lenses when one is on another scale: two groups and a shapes-only line", () => {
    const result = groupMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }),
      chart("b", 4, { spatialFrequency: f15_45 }),
      chart("c", 2, { spatialFrequency: f15_45 }),
      chart("d", 1.4, { spatialFrequency: f10_30 }),
    ]);
    expect(result?.mtfGroups.map(({ lenses }) => lenses.map(({ lens }) => lens))).toEqual([["a", "b", "c"], ["d"]]);
    expect(result?.mtfGroups[1].level).toBe("alone");
    expect(result?.betweenGroups).toMatch(/15\/45 lines\/mm vs 10\/30 lines\/mm/);
    expect(result?.betweenGroups).toMatch(/shape/);
  });

  it("gives a lens with an unstated frequency its own group", () => {
    const result = groupMtfCharts([chart("a", 2.8, { spatialFrequency: f15_45 }), chart("b", 4, {})]);
    expect(result?.mtfGroups).toHaveLength(2);
    expect(result?.betweenGroups).toContain("frequency not stated");
  });

  it("keeps lenses with conflicting stated MTF methods apart, and ignores an unstated method", () => {
    const common = { spatialFrequency: f15_45, apertureFNumbers: [4] };
    expect(groupMtfCharts([
      chart("a", 2.8, { ...common, mtfMethod: "geometrical" }),
      chart("b", 4, { ...common, mtfMethod: "diffraction" }),
    ])?.mtfGroups).toHaveLength(2);
    expect(groupMtfCharts([chart("a", 4, common), chart("b", 4, { ...common, mtfMethod: "diffraction" })])?.mtfGroups).toHaveLength(1);
  });

  it("lists every chart of a lens under that lens, once per lens", () => {
    const result = groupMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }, false, "图 1"),
      chart("a", 2.8, { spatialFrequency: f15_45 }, false, "图 2"),
      chart("b", 4, { spatialFrequency: f15_45 }, false, "img-b (shown in an earlier reply)"),
    ]);
    expect(result?.mtfGroups[0].lenses).toEqual([
      { lens: "a", charts: ["图 1", "图 2"] },
      { lens: "b", charts: ["img-b (shown in an earlier reply)"] },
    ]);
  });

  it("returns undefined for charts of a single lens", () => {
    expect(groupMtfCharts([chart("a", 2.8, { spatialFrequency: f15_45 }), chart("a", 2.8, { spatialFrequency: f15_45 })])).toBeUndefined();
  });
});
