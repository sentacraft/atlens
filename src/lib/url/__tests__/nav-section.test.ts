import { describe, expect, it } from "vitest";
import { navSection } from "../routes";

describe("navSection", () => {
  it.each([
    ["/lenses/x/browse", "lenses"],
    ["/lenses/x/collections/pancake", "lenses"],
    ["/lenses/x/brands/sigma", "lenses"],
    ["/lenses/x/fujifilm-xf-23mmf2-r-wr-x", "lenses"],
    ["/lenses/x/charts/timeline", "charts"],
    ["/lenses/x/compare", null],
    ["/askiris", "iris"],
    ["/me", "me"],
    ["/", null],
    ["/about", null],
  ])("puts %s under %s", (path, section) => {
    expect(navSection(path)).toBe(section);
  });
});
