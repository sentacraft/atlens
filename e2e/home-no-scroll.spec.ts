// Regression: the hero once grew past the viewport. The page scrolls on to the collections, but
// the hero itself must fill exactly one screen.

import { type Page, test, expect } from "@playwright/test";

async function simulateNotch(page: Page) {
  await page.addStyleTag({
    content: `:root {
      --safe-inset-top: 59px;
      --safe-inset-bottom: 34px;
    }`,
  });
}

async function heroOverflows(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const hero = document.querySelector('[data-testid="home-hero"]');
    return !hero || hero.getBoundingClientRect().bottom > window.innerHeight + 1;
  });
}

test.describe("Home page — hero fits one screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
  });

  test("hero fits the viewport in normal browser mode", async ({ page }) => {
    expect(await heroOverflows(page)).toBe(false);
  });

  test("hero fits the viewport with PWA safe-area insets injected", async ({ page }) => {
    await simulateNotch(page);
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    expect(await heroOverflows(page)).toBe(false);
  });
});
