import { describe, expect, it } from "vitest";
import { layoutReviews, toLensReviewsView } from "../reviews-view";
import type { LensReviewClaim, LensReviewSource } from "../reviews";

const source = (id: string): LensReviewSource => ({
  id,
  url: `https://example.com/${id}`,
  site: `Site ${id}`,
  lang: "en",
  kind: "hands_on",
  affiliation: "loaned",
  publisher: `Outlet ${id}`,
});
const claim = (aspect: LensReviewClaim["aspect"], polarity: LensReviewClaim["polarity"], sources: string[], extra: Partial<LensReviewClaim> = {}): LensReviewClaim => ({
  aspect,
  polarity,
  agreement: sources.length > 1 ? "consensus" : "single_source",
  text: `${aspect} in English.`,
  textZh: `${aspect} 中文。`,
  sources,
  reviewCount: sources.length,
  outletCount: sources.length,
  ...extra,
});

describe("toLensReviewsView", () => {
  const row = {
    sources: [source("a")],
    claims: [
      claim("autofocus", "negative", ["a"], {
        details: [{ id: "a", text: "Slow.", textZh: "慢。" }],
        staleness: [
          { id: "a", reason: "pre_x_trans_iv_body" },
          { id: "b", reason: "pre_x_trans_iv_body" },
        ],
      }),
    ],
  };

  it("keeps one language and only the fields a page renders", () => {
    const zh = toLensReviewsView(row, "zh");
    expect(zh.claims[0]).toMatchObject({ text: "autofocus 中文。", details: [{ id: "a", text: "慢。" }] });
    expect(zh.claims[0].staleness).toEqual(["pre_x_trans_iv_body"]);
    expect(zh.sources[0]).not.toHaveProperty("affiliation");
    expect(zh.sources[0]).not.toHaveProperty("publisher");
    expect(JSON.stringify(zh)).not.toContain("English");
    expect(toLensReviewsView(row, "en").claims[0].text).toBe("autofocus in English.");
  });
});

describe("layoutReviews", () => {
  const view = toLensReviewsView(
    {
      sources: ["a", "b", "c", "d", "e"].map(source),
      claims: [
        claim("award", "positive", ["e"]),
        claim("overall", "mixed", ["d", "a"], { agreement: "conflict" }),
        claim("vignetting", "mixed", ["a", "b"]),
        claim("distortion", "positive", ["a"]),
        claim("bokeh", "positive", ["a", "b", "c"]),
        claim("autofocus", "negative", ["c", "b"]),
        claim("build", "positive", ["b"]),
        claim("color", "positive", ["c"]),
        claim("sunstar", "positive", ["a"]),
      ],
    },
    "en",
  );
  const layout = layoutReviews(view);

  it("leads with the overall verdict and groups the rest, best-supported first", () => {
    expect(layout.overall?.aspect).toBe("overall");
    expect(layout.groups.map((g) => [g.group, g.claims.map((c) => c.aspect)])).toEqual([
      ["image", ["bokeh", "vignetting", "distortion", "color", "sunstar"]],
      ["focus", ["autofocus"]],
      ["build", ["build"]],
    ]);
  });

  it("collapses to at most four strengths and four weaknesses, leaving mixed findings for the full view", () => {
    // Ties on review count fall back to group order, image quality first.
    expect(layout.pros.map((c) => c.aspect)).toEqual(["bokeh", "distortion", "color", "sunstar"]);
    expect(layout.cons.map((c) => c.aspect)).toEqual(["autofocus"]);
    expect(layout.total).toBe(8);
  });

  it("leaves awards off the page", () => {
    const shown = [layout.overall, ...layout.groups.flatMap((g) => g.claims), ...layout.pros, ...layout.cons];
    expect(shown.map((c) => c?.aspect)).not.toContain("award");
  });

  it("numbers sources in the order the full view first cites them", () => {
    expect(layout.sourceOrder).toEqual(["d", "a", "b", "c"]);
  });
});
