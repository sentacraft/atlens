import { describe, expect, it } from "vitest";
import { readLensPreview, withLensPreview } from "../lens-preview";

describe("readLensPreview", () => {
  it("reads a lens id and ignores anything that is not one", () => {
    expect(readLensPreview(new URLSearchParams("lens=fujifilm-xf-23mmf2-r-wr-x"))).toBe("fujifilm-xf-23mmf2-r-wr-x");
    expect(readLensPreview(new URLSearchParams("lens=%2Fadmin"))).toBeNull();
    expect(readLensPreview(new URLSearchParams(""))).toBeNull();
  });
});

describe("withLensPreview", () => {
  const location = { pathname: "/en/lenses/x/browse", search: "?t=prime", hash: "#top" };

  it("adds the preview and keeps the page's own params and hash", () => {
    expect(withLensPreview(location, "xf-23")).toBe("/en/lenses/x/browse?t=prime&lens=xf-23#top");
  });

  it("removes the preview, and the question mark with it when nothing is left", () => {
    expect(withLensPreview({ ...location, search: "?t=prime&lens=xf-23" }, null)).toBe("/en/lenses/x/browse?t=prime#top");
    expect(withLensPreview({ pathname: "/en", search: "?lens=xf-23", hash: "" }, null)).toBe("/en");
  });
});
