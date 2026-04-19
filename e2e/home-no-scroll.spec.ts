/**
 * Home page no-scroll regression test
 *
 * The home page is a single-screen hero — it must never be vertically
 * scrollable on mobile. This was broken when the wrapper used min-h instead
 * of an exact h, causing the layout to grow beyond the viewport when the
 * locale layout's pb-[var(--safe-inset-bottom)] added extra height at the
 * bottom (or when content grew taller than the viewport).
 *
 * Runs on all Playwright projects (chromium, android, ios-safari, landscape).
 */

import { type Page, test, expect } from "@playwright/test";

/** Injects PWA safe-area CSS to simulate an iPhone with Dynamic Island + home bar. */
async function simulateNotch(page: Page) {
  await page.addStyleTag({
    content: `:root {
      --safe-inset-top: 59px;
      --safe-inset-bottom: 34px;
    }`,
  });
}

/** Returns true if the document is currently taller than the visible viewport. */
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
    // Allow one rAF for layout reflow after CSS variable change.
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    expect(await isScrollable(page)).toBe(false);
  });
});
