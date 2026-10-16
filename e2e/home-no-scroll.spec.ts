// Regression: the hero once grew past the viewport and pushed its actions out of the first screen.
// The featured collections may fall below the fold on short screens; the actions must not.

import { type Page, test, expect } from "@playwright/test";

async function simulateNotch(page: Page) {
  await page.addStyleTag({
    content: `:root {
      --safe-inset-top: 59px;
      --safe-inset-bottom: 34px;
    }`,
  });
}

async function actionsBelowFold(page: Page): Promise<boolean> {
  const box = await page.getByRole("link", { name: /^Browse all lenses/ }).boundingBox();
  const height = page.viewportSize()?.height ?? 0;
  return !box || box.y + box.height > height;
}

test.describe("Home page — first screen", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.height < 500, "Home hero needs portrait/desktop height");
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
  });

  test("shows the hero actions in normal browser mode", async ({ page }) => {
    expect(await actionsBelowFold(page)).toBe(false);
  });

  test("shows the hero actions with PWA safe-area insets injected", async ({ page }) => {
    await simulateNotch(page);
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    expect(await actionsBelowFold(page)).toBe(false);
  });
});
