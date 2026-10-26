import { test, expect } from "@playwright/test";
import type { LensReviewsView } from "../src/lib/lens/reviews-view";

const LENS_ID = "fujifilm-mkx-18-55mmt29-x";

type Claim = LensReviewsView["claims"][number];
const claim = (aspect: Claim["aspect"], polarity: Claim["polarity"]): Claim => ({
  aspect,
  polarity,
  agreement: "single_source",
  text: `${aspect} finding.`,
  sources: ["a"],
  reviewCount: 1,
  outletCount: 1,
  details: [],
  staleness: [],
  otherMount: false,
});

// Mixed findings show only once expanded, so expanding adds rows above the button.
const REVIEWS: LensReviewsView = {
  sources: [{ id: "a", url: "https://example.com/a", site: "Site A", kind: "hands_on" }],
  claims: [
    claim("overall", "positive"),
    claim("bokeh", "positive"),
    claim("autofocus", "negative"),
    ...(["resolution_center", "resolution_edge", "distortion", "vignetting", "flare", "build", "handling"] as const).map((aspect) =>
      claim(aspect, "mixed"),
    ),
  ],
};

test("expanding the findings keeps the page where the reader was", async ({ page }) => {
  await page.route(`**/api/lenses/${LENS_ID}/reviews*`, (route) => route.fulfill({ json: REVIEWS }));
  await page.goto(`/en/lenses/x/${LENS_ID}`);

  const expand = page.getByRole("button", { name: "Show all 10" });
  await expand.scrollIntoViewIfNeeded();
  // Put the button near the top of the screen, with the collapsed findings above it scrolled out of view.
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) => el.textContent === "Show all 10")!;
    window.scrollBy(0, button.getBoundingClientRect().top - 150);
  });
  const before = await page.evaluate(() => window.scrollY);
  const buttonTop = (await expand.boundingBox())!.y;

  await expand.click();
  const collapse = page.getByRole("button", { name: "Show less" });
  await expect(collapse).toBeVisible();

  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  expect((await collapse.boundingBox())!.y).toBeGreaterThan(buttonTop);
});
