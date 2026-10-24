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

// Prices vary in length; every card must still hold its price and both buttons on one line.
// Phones get mobile emulation so their scrollbars overlay the page instead of taking 15px from it.
for (const width of [375, 390, 1280]) {
  test.describe(`lens list at ${width}px`, () => {
    const phone = width < 768;
    test.use({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone });

    for (const locale of ["en", "zh"]) {
      test(`${locale}: every card keeps price and buttons on one line`, async ({ page }) => {
        await page.goto(`/${locale}/lenses/x/browse`);
        const prices = page.locator("[data-redact-hook=price]");
        await expect(prices.first()).toBeAttached();
        await page.evaluate(() => document.fonts.ready);

        const broken = await prices.evaluateAll((spans) =>
          spans.flatMap((span) => {
            const price = span.parentElement!;
            const actions = price.nextElementSibling;
            if (!actions) {
              return [span.textContent];
            }
            const p = price.getBoundingClientRect();
            const a = actions.getBoundingClientRect();
            const overflow = Math.round(span.getBoundingClientRect().right - p.right);
            return a.top >= p.bottom || a.bottom <= p.top || overflow > 0 ? [`${span.textContent} (+${overflow}px of ${Math.round(p.width)}px)`] : [];
          }),
        );
        expect(broken).toEqual([]);
      });
    }
  });
}
