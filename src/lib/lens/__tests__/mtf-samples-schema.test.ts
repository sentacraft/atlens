import { describe, expect, it } from "vitest";
import { mtfSampleConflicts, mtfSamplesSchema, orphanedMtfSamples } from "../mtf-samples-schema";

const series = {
  frequency: { value: 10, unit: "lp/mm" },
  aperture: 1.4,
  x: [0, 7, 13],
  curves: [{ name: "S", values: [0.9, 0.9, 0.7] }, { name: "M", values: [0.9, null, 0] }],
};
const chart = { axis: "chart ticks, unit not stated", limitations: ["The two traces overlap near tick 7."], series: [series] };
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
    ["a frequency as text", { series: [{ ...series, frequency: "10 lp/mm" }] }],
    ["a frequency without a unit", { series: [{ ...series, frequency: { value: 10 } }] }],
    ["an unknown frequency unit", { series: [{ ...series, frequency: { value: 10, unit: "cycles/mm" } }] }],
    ["a frequency of zero", { series: [{ ...series, frequency: { value: 0, unit: "lp/mm" } }] }],
    ["an extra frequency field", { series: [{ ...series, frequency: { value: 10, unit: "lp/mm", note: "a" } }] }],
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

describe("mtfSampleConflicts", () => {
  const image = {
    id: "002",
    role: "mtf" as const,
    focalLengthMm: 35,
    apertureFNumbers: [1.4, 5.6],
    spatialFrequency: { values: [10, 30], unit: "lp/mm" as const },
  };
  const bare = { id: "002", role: "mtf" as const };
  const conflicts = (patch: object, catalogImage: typeof image | typeof bare = image) => {
    const reading = { x: series.x, curves: series.curves, ...patch };
    const samples = mtfSamplesSchema.parse({ lens: { "002": { ...chart, series: [reading] } } });
    return mtfSampleConflicts(samples, [{ id: "lens", images: [catalogImage] }]);
  };

  it("accepts conditions the catalog image confirms", () => {
    expect(conflicts({ frequency: { value: 30, unit: "lp/mm" }, aperture: 5.6, focalLengthMm: 35 })).toEqual([]);
  });

  it("does not check fields the reading omits", () => {
    expect(conflicts({})).toEqual([]);
    expect(conflicts({}, bare)).toEqual([]);
  });

  it.each([
    ["frequency", "a value the image does not list", { frequency: { value: 40, unit: "lp/mm" } }, image],
    ["frequency", "a different unit", { frequency: { value: 10, unit: "lines/mm" } }, image],
    ["frequency", "an image without frequencies", { frequency: { value: 10, unit: "lp/mm" } }, bare],
    ["aperture", "a value the image does not list", { aperture: 2.2 }, image],
    ["aperture", "an image without apertures", { aperture: 1.4 }, bare],
    ["focalLengthMm", "a different value", { focalLengthMm: 50 }, image],
    ["focalLengthMm", "an image without a focal length", { focalLengthMm: 35 }, bare],
  ])("rejects %s: %s", (field, _, patch, catalogImage) => {
    expect(conflicts(patch, catalogImage)).toEqual([expect.stringContaining(`lens/002: series[0].${field} `)]);
  });

  it("reports every conflict in every series", () => {
    const samples = mtfSamplesSchema.parse({
      lens: { "002": { ...chart, series: [{ ...series, aperture: 2 }, { ...series, aperture: 4, focalLengthMm: 50 }] } },
    });
    expect(mtfSampleConflicts(samples, [{ id: "lens", images: [image] }])).toHaveLength(3);
  });
});
