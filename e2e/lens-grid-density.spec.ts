import { test, expect, type Page } from "@playwright/test";

const CARD_LINKS =
  'a[href^="/en/lenses/x/"]:not([href$="/browse"]):not([href$="/collections"]):not([href*="/compare"])';

async function layoutAt(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await expect(page.locator(CARD_LINKS).first()).toBeVisible();
  return page.locator(CARD_LINKS).first().evaluate((link) => {
    const card = link.parentElement!;
    const grid = card.parentElement!;
    const nav = document.querySelector("nav")!;
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      cardWidth: card.getBoundingClientRect().width,
      gridLeft: grid.getBoundingClientRect().left,
      navContentLeft: nav.getBoundingClientRect().left + parseFloat(getComputedStyle(nav).paddingLeft),
    };
  });
}

test.describe("Lens library grid density", () => {
  test.skip(({ isMobile }) => isMobile, "Sets desktop and tablet viewport widths itself");

  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses/x");
  });

  for (const [width, columns] of [
    [768, 3],
    [1000, 4],
    [1279, 5],
    [1600, 5],
  ] as const) {
    test(`${width}px shows ${columns} columns of cards no wider than 290px`, async ({ page }) => {
      const layout = await layoutAt(page, width);
      expect(layout.columns).toBe(columns);
      expect(layout.cardWidth).toBeLessThanOrEqual(290);
    });
  }

  test("the grid lines up with the nav bar's content edge", async ({ page }) => {
    for (const width of [640, 1024, 1600]) {
      const layout = await layoutAt(page, width);
      expect(Math.abs(layout.gridLeft - layout.navContentLeft)).toBeLessThanOrEqual(1);
    }
  });
});
