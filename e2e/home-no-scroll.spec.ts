// Regression: the hero wrapper once used min-h instead of h and grew past the viewport.

import { type Page, test, expect } from "@playwright/test";

async function simulateNotch(page: Page) {
  await page.addStyleTag({
    content: `:root {
      --safe-inset-top: 59px;
      --safe-inset-bottom: 34px;
    }`,
  });
}

async function isScrollable(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1
  );
}

test.describe("Home page — no vertical scroll", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
  });

  test("page is not vertically scrollable in normal browser mode", async ({ page }) => {
    expect(await isScrollable(page)).toBe(false);
  });

  test("page is not vertically scrollable with PWA safe-area insets injected", async ({ page }) => {
    await simulateNotch(page);
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    expect(await isScrollable(page)).toBe(false);
  });
});
