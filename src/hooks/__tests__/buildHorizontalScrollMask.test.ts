import { describe, it, expect } from "vitest";
import { buildHorizontalScrollMask } from "../useHorizontalScrollAffordance";

describe("buildHorizontalScrollMask", () => {
  it("returns undefined when neither side overflows", () => {
    expect(buildHorizontalScrollMask(false, false)).toBeUndefined();
  });

  it("returns right-only gradient when only right overflows", () => {
    const mask = buildHorizontalScrollMask(false, true);
    expect(mask).toContain("calc(100% - 4rem)");
    expect(mask).not.toContain("black 4rem,");
  });

  it("returns left-only gradient when only left overflows", () => {
    const mask = buildHorizontalScrollMask(true, false);
    expect(mask).toContain("black 4rem");
    expect(mask).not.toContain("calc(100% - 4rem)");
  });

  it("returns both-side gradient when both sides overflow", () => {
    const mask = buildHorizontalScrollMask(true, true);
    expect(mask).toContain("black 4rem");
    expect(mask).toContain("calc(100% - 4rem)");
  });
});
