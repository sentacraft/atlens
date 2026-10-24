import { test, expect, type Locator } from "@playwright/test";
import type { LensReviewsView } from "../src/lib/lens/reviews-view";

const LENS_ID = "fujifilm-mkx-18-55mmt29-x";

const claim = (aspect: LensReviewsView["claims"][number]["aspect"], sources: string[], staleness: LensReviewsView["claims"][number]["staleness"] = []) => ({
  aspect,
  polarity: "positive" as const,
  agreement: sources.length > 1 ? ("consensus" as const) : ("single_source" as const),
  text: `${aspect} finding.`,
  sources,
  reviewCount: sources.length,
  outletCount: sources.length,
  details: [],
  staleness,
  otherMount: false,
});

const REVIEWS: LensReviewsView = {
  sources: ["a", "b", "c"].map((id) => ({ id, url: `https://example.com/${id}`, site: `Site ${id}`, kind: "hands_on" as const })),
  claims: [claim("overall", ["a"]), claim("bokeh", ["a", "b", "c"]), claim("autofocus", ["b", "a"], ["unknown_body"])],
};

// The point just inside each edge and at the center of a control must land on that control, not on a neighbour.
async function ownsItsBox(control: Locator) {
  return control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const y = r.top + r.height / 2;
    return [r.left + 1, r.left + r.width / 2, r.right - 1].every((x) => document.elementFromPoint(x, y)?.closest("button") === el);
  });
}

test("adjacent source markers each take their own hover and click", async ({ page }) => {
  await page.route(`**/api/lenses/${LENS_ID}/reviews*`, (route) => route.fulfill({ json: REVIEWS }));
  await page.goto(`/en/lenses/x/${LENS_ID}`);
  await page.getByRole("button", { name: "Show all 3" }).click();

  const row = page.getByRole("listitem").filter({ hasText: "autofocus finding." });
  const markers = row.getByRole("button", { name: /^Source \d+:/ });
  await expect(markers).toHaveCount(2);
  for (const marker of await markers.all()) {
    expect(await ownsItsBox(marker)).toBe(true);
  }
  expect(await ownsItsBox(row.getByRole("button", { name: /^Some reviewers didn't name the body/ }))).toBe(true);
});
