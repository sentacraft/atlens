import { test, expect } from "@playwright/test";

// Every page that lists lenses as items to browse gives each one both favorite and compare.
const PAGES = [
  { name: "lens list", path: "/en/lenses/x/browse" },
  { name: "brand page", path: "/en/lenses/x/brands/viltrox" },
  { name: "collection page", path: "/en/lenses/x/collections/pancake" },
  { name: "lens page, same-focal alternatives", path: "/en/lenses/x/fujifilm-xf-33mmf14-r-lm-wr-x" },
];

const COMPARE = /^(Add to Compare|Remove from Compare|Compare List Full)/;
const FAVORITE = /^(Favorite|Favorited|Remove from favorites)/;

for (const { name, path } of PAGES) {
  test(`${name}: every compare button has a favorite beside it`, async ({ page }) => {
    await page.goto(path);
    const compares = page.getByRole("button", { name: COMPARE });
    await expect(compares.first()).toBeAttached();

    const compareCount = await compares.count();
    expect(compareCount).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: FAVORITE })).toHaveCount(compareCount);
  });
}
