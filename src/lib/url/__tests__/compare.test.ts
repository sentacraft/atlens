import { describe, expect, it } from "vitest";
import { buildComparePath, readCompareIds } from "../compare";

describe("readCompareIds", () => {
  it("reads the comma list from ?ids", () => {
    expect(readCompareIds("xf-23,xf-33")).toEqual(["xf-23", "xf-33"]);
    expect(readCompareIds(undefined)).toEqual([]);
    expect(readCompareIds("xf-23,,")).toEqual(["xf-23"]);
  });

  // `?ids=a&ids=b` arrives from Next as an array; it used to reach `.split` and throw.
  it("takes the first of a repeated ?ids", () => {
    expect(readCompareIds(["xf-23,xf-33", "xf-56"])).toEqual(["xf-23", "xf-33"]);
  });
});

describe("buildComparePath", () => {
  it("keeps commas unencoded", () => {
    expect(buildComparePath("X", ["xf-23", "xf-33"])).toBe("/lenses/x/compare?ids=xf-23,xf-33");
  });
});
