import { describe, expect, it } from "vitest";
import type { Lens } from "@/lib/types";
import { getLensesByMount } from "@/lib/lens/data";
import {
  apertureDelta,
  findSameFocalAlternatives,
  focalDelta,
  planAlternativeCompare,
  weightDelta,
  zoomOverlap,
} from "@/lib/lens/alternatives";

function makeLens(overrides: Partial<Lens> = {}): Lens {
  return {
    id: "test-lens",
    brand: "fujifilm",
    mount: "X",
    model: "Test Lens",
    officialLinks: {},
    focalLengthMin: 35,
    focalLengthMax: 35,
    maxAperture: 2,
    minAperture: 16,
    af: true,
    ois: false,
    wr: false,
    apertureRing: false,
    powerZoom: false,
    internalZoom: false,
    weightG: 170,
    diameterMm: 60,
    length: { mm: 46 },
    angleOfViewCalc: 44,
    searchAliases: { en: "Test Lens" },
    ...overrides,
  };
}

const ids = (lenses: Lens[]) => lenses.map((lens) => lens.id);

describe("findSameFocalAlternatives", () => {
  it("takes primes within 10% of the focal length and no zooms", () => {
    const current = makeLens({ id: "cur" });
    const lenses = [
      current,
      makeLens({ id: "33", focalLengthMin: 33, focalLengthMax: 33 }),
      makeLens({ id: "38", focalLengthMin: 38, focalLengthMax: 38 }),
      makeLens({ id: "40", focalLengthMin: 40, focalLengthMax: 40 }),
      makeLens({ id: "zoom", focalLengthMin: 18, focalLengthMax: 55 }),
    ];

    expect(ids(findSameFocalAlternatives(current, lenses))).toEqual(["33", "38"]);
  });

  it("matches cine lenses and special optics only with their own kind", () => {
    const current = makeLens({ id: "cur" });
    const lenses = [
      makeLens({ id: "cine", isCine: true }),
      makeLens({ id: "shift", opticalTraits: ["shift"] }),
      makeLens({ id: "macro", opticalTraits: ["macro"] }),
    ];

    expect(ids(findSameFocalAlternatives(current, lenses))).toEqual(["macro"]);
    expect(ids(findSameFocalAlternatives(makeLens({ id: "cur", isCine: true }), lenses))).toEqual(["cine"]);
  });

  it("lists the same focus mode first, then the closest focal length, then the lightest", () => {
    const current = makeLens({ id: "cur" });
    const lenses = [
      makeLens({ id: "mf", af: false, weightG: 100 }),
      makeLens({ id: "33", focalLengthMin: 33, focalLengthMax: 33, weightG: 100 }),
      makeLens({ id: "heavy", weightG: 300 }),
      makeLens({ id: "light", weightG: 150 }),
    ];

    expect(ids(findSameFocalAlternatives(current, lenses))).toEqual(["light", "heavy", "33", "mf"]);
  });

  it("matches the standard zooms around the XF 18-55mm and leaves out the 18-135mm", () => {
    const lenses = getLensesByMount("X", "en");
    const current = lenses.find((lens) => lens.model === "XF 18-55mm F2.8-4 R LM OIS")!;
    const models = findSameFocalAlternatives(current, lenses).map((lens) => lens.model);

    expect(models).toEqual(expect.arrayContaining(["XF 16-55mm F2.8 R LM WR II", "XF 16-50mm F2.8-4.8 R LM WR", "XC 15-45mm F3.5-5.6 OIS PZ"]));
    expect(models.some((model) => model.includes("18-135"))).toBe(false);
  });
});

describe("zoomOverlap", () => {
  it("measures the shared range on a log scale", () => {
    const base = { focalLengthMin: 18, focalLengthMax: 55 };

    expect(zoomOverlap(base, base)).toBe(1);
    expect(zoomOverlap(base, { focalLengthMin: 18, focalLengthMax: 135 })).toBeCloseTo(Math.log(55 / 18) / Math.log(135 / 18));
    expect(zoomOverlap(base, { focalLengthMin: 70, focalLengthMax: 300 })).toBe(0);
  });
});

describe("apertureDelta", () => {
  const current = makeLens({ maxAperture: 2 });

  it("counts thirds of a stop", () => {
    expect(apertureDelta(current, makeLens({ maxAperture: 2 }))).toEqual({ kind: "same" });
    expect(apertureDelta(current, makeLens({ maxAperture: 1.8 }))).toEqual({ kind: "brighter", thirds: 1 });
    expect(apertureDelta(current, makeLens({ maxAperture: 1.4 }))).toEqual({ kind: "brighter", thirds: 3 });
    expect(apertureDelta(current, makeLens({ maxAperture: 2.8 }))).toEqual({ kind: "darker", thirds: 3 });
  });

  it("calls out a constant-aperture zoom against a variable one", () => {
    const zoom = makeLens({ focalLengthMin: 18, focalLengthMax: 55, maxAperture: [2.8, 4] });

    expect(apertureDelta(zoom, makeLens({ focalLengthMin: 16, focalLengthMax: 55, maxAperture: 2.8 }))).toEqual({ kind: "constant" });
    expect(apertureDelta(zoom, makeLens({ focalLengthMin: 15, focalLengthMax: 45, maxAperture: [3.5, 5.6] }))).toEqual({ kind: "darker", thirds: 2 });
  });

  it("has nothing to say about a T-stop-only lens", () => {
    expect(apertureDelta(current, makeLens({ maxAperture: undefined, maxTStop: 2.1 }))).toBeNull();
  });
});

describe("weightDelta", () => {
  const current = makeLens({ weightG: 170 });

  it("calls differences within 10% close", () => {
    expect(weightDelta(current, makeLens({ weightG: 170 }))).toEqual({ kind: "same" });
    expect(weightDelta(current, makeLens({ weightG: 187 }))).toEqual({ kind: "close" });
    expect(weightDelta(current, makeLens({ weightG: 130 }))).toEqual({ kind: "lighter", grams: 40 });
    expect(weightDelta(current, makeLens({ weightG: 218 }))).toEqual({ kind: "heavier", grams: 48 });
  });

  it("compares a weight range by its midpoint", () => {
    expect(weightDelta(current, makeLens({ weightG: [247, 267] }))).toEqual({ kind: "heavier", grams: 87 });
  });
});

describe("focalDelta", () => {
  it("reports how much wider and longer the other zoom reaches", () => {
    const current = makeLens({ focalLengthMin: 18, focalLengthMax: 55 });

    expect(focalDelta(current, makeLens({ focalLengthMin: 16, focalLengthMax: 50 }))).toEqual({ wider: 2, longer: -5 });
  });
});

describe("planAlternativeCompare", () => {
  it("starts a comparison of the current lens and the alternative when the bar lacks the current lens", () => {
    expect(planAlternativeCompare([], "cur", "alt", 4)).toEqual({ kind: "start", replaced: [] });
    expect(planAlternativeCompare(["a", "b"], "cur", "alt", 4)).toEqual({ kind: "start", replaced: ["a", "b"] });
  });

  it("adds to a bar built around the current lens, unless it is full", () => {
    expect(planAlternativeCompare(["cur", "a"], "cur", "alt", 4)).toEqual({ kind: "add" });
    expect(planAlternativeCompare(["cur", "a", "b", "c"], "cur", "alt", 4)).toEqual({ kind: "full" });
  });

  it("takes out an alternative that is already in the bar", () => {
    expect(planAlternativeCompare(["cur", "alt"], "cur", "alt", 4)).toEqual({ kind: "remove" });
  });
});
