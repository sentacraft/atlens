import { test, expect, type Page } from "@playwright/test";

// Has three store links, so the price button carries its longest label.
const LENS_PATH = "lenses/x/laowa-cf-12-24mmf56-zoom-shift-x";
const WIDTHS = [320, 375, 414, 640, 700, 768, 900, 1024, 1280, 1440];

const LABELS = {
  en: { compare: "Add to Compare", favorite: "Favorite", owned: "Mark as owned" },
  zh: { compare: "加入对比", favorite: "收藏", owned: "标记为已拥有" },
} as const;

async function expectTwoRows(page: Page, locale: keyof typeof LABELS) {
  const labels = LABELS[locale];
  const main = page.locator("main, body").first();
  const compare = main.getByRole("button", { name: labels.compare, exact: true });
  const price = page.getByTestId("lens-detail-price-trigger");
  const favorite = page.getByRole("button", { name: labels.favorite, exact: true });
  const owned = page.getByRole("button", { name: labels.owned, exact: true });
  const row = page.getByTestId("lens-detail-actions");

  const [f, c, p, o, r] = await Promise.all(
    [favorite, compare, price, owned, row].map(async (locator) => {
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      expect(box, "every action is laid out").not.toBeNull();
      return box!;
    }),
  );

  expect(Math.round(c.y), "compare shares the first row").toBe(Math.round(f.y));
  expect(p.y, "price starts the second row").toBeGreaterThan(f.y + f.height - 1);
  expect(Math.round(o.y), "owned shares the second row").toBe(Math.round(p.y));
  for (const [first, second] of [[f, c], [p, o]]) {
    expect(Math.round(first.width), "a row's two buttons split it evenly").toBe(Math.round(second.width));
    expect(second.x + second.width, "the row fits its column").toBeLessThanOrEqual(r.x + r.width + 1);
  }
  expect(Math.round(p.x), "the rows line up").toBe(Math.round(f.x));
}

for (const locale of ["en", "zh"] as const) {
  test.describe(`lens detail actions (${locale})`, () => {
    for (const width of WIDTHS) {
      test(`two on the first row, two on the second at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}/${LENS_PATH}`);
        await expectTwoRows(page, locale);
      });
    }
  });
}

test("keeps the rows while Iris's side panel narrows the page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/en/${LENS_PATH}`);
  await page.getByRole("banner").getByRole("button", { name: /^Ask Iris/ }).click();
  await expect(page.getByRole("complementary", { name: "Iris" })).toBeVisible();
  await expectTwoRows(page, "en");
});
