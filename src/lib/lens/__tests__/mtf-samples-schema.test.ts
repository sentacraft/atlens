import { describe, expect, it } from "vitest";
import { mtfSamplesSchema, orphanedMtfSamples } from "../mtf-samples-schema";

const series = {
  frequency: "10 lp/mm",
  aperture: 1.4,
  x: [0, 7, 13],
  curves: [{ name: "S", values: [0.9, 0.9, 0.7] }, { name: "M", values: [0.9, null, 0] }],
};
const chart = { axis: "chart ticks, unit not stated", limitations: ["The frequency unit is not stated."], series: [series] };
const parse = (patch: object) => mtfSamplesSchema.safeParse({ lens: { "002": { ...chart, ...patch } } });

describe("mtfSamplesSchema", () => {
  it("accepts paired, single and labelled curves, and an empty file", () => {
    const single = { label: "Gray trace, higher at tick 13", x: [13], curves: [{ name: "value", values: [0.4] }] };
    expect(parse({ series: [series, single] }).success).toBe(true);
    expect(mtfSamplesSchema.safeParse({}).success).toBe(true);
  });

  it.each([
    ["an unknown chart field", { humanReviewed: true }],
    ["no series", { series: [] }],
    ["a blank limitation", { limitations: [" "] }],
    ["a curve shorter than its positions", { series: [{ ...series, curves: [{ name: "S", values: [0.9] }] }] }],
    ["a reading above 1", { series: [{ ...series, x: [0], curves: [{ name: "S", values: [1.01] }] }] }],
    ["a private series field", { series: [{ ...series, sha256: "a" }] }],
  ])("rejects %s", (_, patch) => {
    expect(parse(patch).success).toBe(false);
  });
});

describe("orphanedMtfSamples", () => {
  it("names keys that match no MTF chart in the catalog", () => {
    const samples = mtfSamplesSchema.parse({ lens: { "001": chart, "002": chart }, gone: { "002": chart } });
    const lenses = [{ id: "lens", images: [{ id: "001", role: "product" }, { id: "002", role: "mtf" }] }];
    expect(orphanedMtfSamples(samples, lenses)).toEqual(["lens/001", "gone/002"]);
  });
});
