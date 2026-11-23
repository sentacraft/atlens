import { describe, it, expect } from "vitest";
import { compareMtfCharts, type MtfChart } from "../mtf-comparison";
import type { LensImageAsset } from "@/lib/types";

const chart = (lensRef: string, maxAperture: MtfChart["maxAperture"], image: Partial<LensImageAsset>, zoom = false): MtfChart => ({
  lensRef,
  zoom,
  maxAperture,
  image: { id: "001", role: "mtf", ...image },
});

const f15_45 = { values: [15, 45], unit: "lines/mm" as const };

describe("compareMtfCharts", () => {
  it("grades charts with unstated test apertures as comparable with caveats", () => {
    const result = compareMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }, true),
      chart("b", 4, { spatialFrequency: f15_45, focalLengthMm: 16 }, true),
    ]);
    expect(result?.level).toBe("values-with-caveats");
    expect(result?.conditions.find((c) => c.condition === "testAperture")?.status).toBe("unstated");
    const aperture = result?.caveats.find((text) => text.includes("test aperture"));
    expect(aperture).toContain("f/2.8");
    expect(aperture).toContain("f/4");
  });

  it("names a wide-angle-end note on an unstated focal length", () => {
    const result = compareMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45, apertureFNumbers: [2.8] }, true),
      chart("b", [3.5, 5.6], { spatialFrequency: f15_45, apertureFNumbers: [2.8], conditionsNote: "Wide-angle end" }, true),
    ]);
    expect(result?.level).toBe("values-with-caveats");
    expect(result?.caveats.join(" ")).toContain("focal length");
  });

  it("is shape-only when the spatial frequencies differ", () => {
    const result = compareMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }),
      chart("b", 4, { spatialFrequency: { values: [10, 30], unit: "lines/mm" } }),
    ]);
    expect(result?.level).toBe("shape-only");
    expect(result?.conditions.find((c) => c.condition === "spatialFrequency")?.status).toBe("differs");
  });

  it("is shape-only when a spatial frequency is unstated", () => {
    expect(compareMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }),
      chart("b", 4, {}),
    ])?.level).toBe("shape-only");
  });

  it("is shape-only when the MTF methods differ", () => {
    const common = { spatialFrequency: f15_45, apertureFNumbers: [4] };
    expect(compareMtfCharts([
      chart("a", 2.8, { ...common, mtfMethod: "geometrical" }),
      chart("b", 4, { ...common, mtfMethod: "diffraction" }),
    ])?.level).toBe("shape-only");
  });

  it("ignores an unstated MTF method", () => {
    const result = compareMtfCharts([
      chart("a", 4, { spatialFrequency: f15_45, apertureFNumbers: [4] }),
      chart("b", 4, { spatialFrequency: f15_45, apertureFNumbers: [4] }),
    ]);
    expect(result?.level).toBe("values");
    expect(result?.caveats).toEqual([]);
  });

  it("names differing test apertures", () => {
    const result = compareMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45, apertureFNumbers: [2.8] }),
      chart("b", 4, { spatialFrequency: f15_45, apertureFNumbers: [8] }),
    ]);
    expect(result?.level).toBe("values-with-caveats");
    expect(result?.caveats.join(" ")).toContain("f/8");
  });

  it("returns undefined for charts of a single lens", () => {
    expect(compareMtfCharts([
      chart("a", 2.8, { spatialFrequency: f15_45 }),
      chart("a", 2.8, { spatialFrequency: f15_45 }),
    ])).toBeUndefined();
  });
});
