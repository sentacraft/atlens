import { describe, expect, it } from "vitest";
import { pageKey, parsePagePath } from "../page-ref";

describe("parsePagePath", () => {
  it("reads browse filters, compared lenses and a lens page, with or without a locale", () => {
    expect(parsePagePath("/zh/lenses/x/browse?t=zoom")).toMatchObject({ kind: "browse", mount: "X", filters: { typeFilter: "zoom" } });
    expect(parsePagePath("/en/lenses/gfx/compare?ids=a%2Cb")).toEqual({ kind: "compare", mount: "G", lensIds: ["a", "b"] });
    expect(parsePagePath("/lenses/x/xf-56")).toEqual({ kind: "lens", mount: "X", lensId: "xf-56" });
  });

  it("has no page for other paths", () => {
    for (const path of ["/", "/en/about", "/en/lenses/x/collections", "/en/lenses/x/collections/pancake", "/en/lenses/x/compare", "/en/lenses/y/xf-56"]) {
      expect(parsePagePath(path)).toBeNull();
    }
  });
});

describe("pageKey", () => {
  const key = (path: string) => pageKey(parsePagePath(path));

  it("treats browse with other filters as the same page", () => {
    expect(key("/en/lenses/x/browse?t=zoom")).toBe(key("/zh/lenses/x/browse?t=prime"));
  });

  it("tells apart other lenses and other comparisons, but not their order", () => {
    expect(key("/en/lenses/x/a")).not.toBe(key("/en/lenses/x/b"));
    expect(key("/en/lenses/x/compare?ids=a,b")).toBe(key("/en/lenses/x/compare?ids=b,a"));
    expect(key("/en/lenses/x/compare?ids=a,b")).not.toBe(key("/en/lenses/x/compare?ids=a,c"));
  });

  it("is null without a page", () => {
    expect(key("/en/about")).toBeNull();
  });
});
