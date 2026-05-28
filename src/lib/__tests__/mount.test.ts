import { describe, it, expect } from "vitest";
import { urlSegmentToMount, mountToUrlSegment, mountSeoLabel } from "../mount";

describe("urlSegmentToMount", () => {
  it("maps 'x' to X", () => {
    expect(urlSegmentToMount("x")).toBe("X");
  });

  it("maps 'gfx' to G", () => {
    expect(urlSegmentToMount("gfx")).toBe("G");
  });

  it("returns null for unknown segments", () => {
    expect(urlSegmentToMount("ef")).toBeNull();
    expect(urlSegmentToMount("z")).toBeNull();
    expect(urlSegmentToMount("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(urlSegmentToMount(undefined)).toBeNull();
  });

  it("is case-sensitive", () => {
    expect(urlSegmentToMount("X")).toBeNull();
    expect(urlSegmentToMount("GFX")).toBeNull();
  });
});

describe("mountToUrlSegment", () => {
  it("maps X to 'x'", () => {
    expect(mountToUrlSegment("X")).toBe("x");
  });

  it("maps G to 'gfx'", () => {
    expect(mountToUrlSegment("G")).toBe("gfx");
  });
});

describe("mountSeoLabel", () => {
  it("returns X for X mount", () => {
    expect(mountSeoLabel("X")).toBe("X");
  });

  it("returns GFX for G mount", () => {
    expect(mountSeoLabel("G")).toBe("GFX");
  });
});
