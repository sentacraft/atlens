import { describe, expect, it } from "vitest";
import { layoutReviews, previewReviews, toLensReviewsView } from "../reviews-view";
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
      sources: ["a", "b", "c", "d"].map(source),
      claims: [
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
    expect(layout.summary.map((c) => c.aspect)).toEqual(["overall"]);
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

  it("numbers sources in the order the full view first cites them", () => {
    expect(layout.sourceOrder).toEqual(["d", "a", "b", "c"]);
  });
});

describe("previewReviews", () => {
  const row = {
    sources: ["a", "b", "c", "d", "e", "f"].map(source),
    claims: [
      claim("overall", "positive", ["a"]),
      claim("resolution_center", "positive", ["a", "b"], { details: [{ id: "b", text: "Sharp.", textZh: "锐。" }] }),
      claim("bokeh", "positive", ["b"]),
      claim("color", "positive", ["b"]),
      claim("flare", "positive", ["b"]),
      claim("sunstar", "positive", ["f"]),
      claim("autofocus", "negative", ["c"]),
      claim("vignetting", "mixed", ["d"]),
      claim("manual_focus", "mixed", ["d", "e"], { agreement: "conflict" }),
    ],
  };
  const full = toLensReviewsView(row, "en");
  const preview = previewReviews(full);

  it("keeps the summary and the collapsed strengths and weaknesses, without their details", () => {
    expect(preview.claims.map((c) => c.aspect)).toEqual(["overall", "resolution_center", "bokeh", "flare", "color", "autofocus"]);
    expect(preview.claims.every((c) => c.details.length === 0)).toBe(true);
  });

  it("sends only the sources the kept findings cite", () => {
    expect(preview.sources.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("says how much the full view holds", () => {
    expect(preview.locked).toEqual({
      total: 9,
      sourceCount: 6,
      disputed: ["manual_focus"],
      hiddenAspects: ["manual_focus", "vignetting", "sunstar"],
    });
    expect(full.locked).toBeUndefined();
  });
});
