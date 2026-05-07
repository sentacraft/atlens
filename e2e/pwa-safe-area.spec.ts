/**
 * PWA safe-area inset tests
 *
 * Verifies that every component consuming --safe-inset-* CSS variables correctly
 * translates those values into layout offsets. Real devices expose these values
 * via env(safe-area-inset-*); in tests we override the CSS variables directly,
 * which works because all consumers reference var(--safe-inset-*) rather than
 * env() — the centralization that makes this test suite possible.
 *
 * Runs on the ios-pwa Playwright project (iPhone 15 viewport, see playwright.config.ts).
 */

import { type Page, test, expect } from "@playwright/test";

// Pixel values that match a real iPhone 15 in standalone PWA mode.
const NOTCH_TOP = 59; // Dynamic Island region height
const HOME_BAR = 34; // home indicator bar height

/**
 * Injects CSS variable overrides into the page to simulate a notch environment.
 * The injected <style> tag appears after the existing stylesheet in document order,
 * giving it precedence over the original :root definitions.
 */
async function simulateNotch(page: Page) {
  await page.addStyleTag({
    content: `:root {
      --safe-inset-top: ${NOTCH_TOP}px;
      --safe-inset-bottom: ${HOME_BAR}px;
    }`,
  });
}

/** Returns the computed numeric value (px) of a CSS property for a selector. */
async function computedPx(page: Page, selector: string, property: string): Promise<number> {
  return page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel as string);
      if (!el) throw new Error(`Element not found: ${sel}`);
      return parseFloat(getComputedStyle(el).getPropertyValue(prop as string));
    },
    [selector, property]
  );
}

const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";

// ─── Nav ────────────────────────────────────────────────────────────────────

test.describe("Nav top inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("nav paddingTop equals --safe-inset-top when --titlebar-height is 0", async ({ page }) => {
    // In a standalone PWA on iPhone there is no WCO, so --titlebar-height stays 0.
    // paddingTop should therefore equal exactly NOTCH_TOP.
    const paddingTop = await computedPx(page, "header", "padding-top");
    expect(paddingTop).toBe(NOTCH_TOP);
  });

});

// ─── Compare page phantom header ────────────────────────────────────────────

test.describe("Compare phantom header top inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/compare?ids=${LENS_A},${LENS_B}`);
    await page.locator('[data-testid="compare-phantom-header"]').waitFor({ state: "attached" });
    await simulateNotch(page);
  });

  test("sticky container top equals --safe-inset-top on mobile viewport", async ({ page }) => {
    // On mobile (< 640px) the container uses top-[var(--safe-inset-top)].
    // Confirm the computed top matches our injected value.
    const top = await computedPx(page, '[data-testid="compare-phantom-container"]', "top");
    expect(top).toBe(NOTCH_TOP);
  });
});

// ─── Compare bar (bottom safe area) ─────────────────────────────────────────

test.describe("CompareBar bottom inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("compare bar paddingBottom equals --safe-inset-bottom", async ({ page }) => {
    // iPhone 15 viewport is 390px < 499px, so the icon button (max-[499px]:flex)
    // is visible. Use its aria-label to trigger the compare bar.
    const addBtn = page.getByRole("button", { name: /add to compare/i }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    const bar = page.locator('[data-testid="compare-bar"]');
    await bar.waitFor({ state: "attached" });

    const paddingBottom = await computedPx(page, '[data-testid="compare-bar"]', "padding-bottom");
    expect(paddingBottom).toBe(HOME_BAR);
  });
});

// ─── Layout wrapper (page body bottom inset) ────────────────────────────────

test.describe("Layout body bottom inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("page body wrapper paddingBottom equals --safe-inset-bottom", async ({ page }) => {
    // The main layout div uses pb-[var(--safe-inset-bottom)] to push content
    // above the iOS home indicator bar.
    const paddingBottom = await page.evaluate(() => {
      // The layout wrapper sits directly under <body> — find by nav-height pt class
      const el = document.querySelector(".pt-\\[var\\(--nav-height\\)\\]");
      if (!el) throw new Error("Layout wrapper not found");
      return parseFloat(getComputedStyle(el).paddingBottom);
    });
    expect(paddingBottom).toBe(HOME_BAR);
  });
});
