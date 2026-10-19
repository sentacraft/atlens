import { describe, expect, it } from "vitest";
import { movingAverage, percentChange } from "../series";

describe("movingAverage", () => {
  it("averages the trailing window and leaves the warm-up points empty", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("percentChange", () => {
  it("is relative to the previous value and undefined without one", () => {
    expect(percentChange(150, 100)).toBe(0.5);
    expect(percentChange(50, 100)).toBe(-0.5);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(5, null)).toBeNull();
  });
});
