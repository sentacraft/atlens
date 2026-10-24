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

// Prices vary in length, so a shared row would hold both on some cards and wrap on others.
for (const width of [375, 1280]) {
  test(`lens list at ${width}px: every card puts its buttons on a line below the price`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en/lenses/x/browse");
    const compares = page.getByRole("button", { name: COMPARE });
    await expect(compares.first()).toBeAttached();

    const sharedLines = await compares.evaluateAll((buttons) =>
      buttons.filter((button) => {
        const actions = button.parentElement!;
        const price = actions.previousElementSibling;
        return !price || actions.getBoundingClientRect().top < price.getBoundingClientRect().bottom;
      }).length,
    );
    expect(sharedLines).toBe(0);
  });
}
