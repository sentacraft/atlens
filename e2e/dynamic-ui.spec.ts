import { test, expect } from "@playwright/test";

const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";

// Scrolls the page via window.scrollBy so the browser fires a real scroll event
// on window (which is what Nav and other components now listen to).
async function scrollBy(page: import("@playwright/test").Page, deltaY: number) {
  await page.evaluate((dy) => window.scrollBy(0, dy), deltaY);
  // Brief pause so the scroll event has time to propagate to React state.
  await page.waitForTimeout(50);
}

async function scrollToTop(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
}

// Waits until the document has enough content height to allow scrolling.
async function waitForScrollable(page: import("@playwright/test").Page, minDelta = 200) {
  await page.waitForFunction(
    (minY) => document.documentElement.scrollHeight > window.innerHeight + minY,
    minDelta,
    { timeout: 10000 }
  );
}

test.describe("Nav auto-hide (mobile only)", () => {
  // Nav only hides on mobile viewports (< 640px). Skip on desktop Chromium.
  test.beforeEach(async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width >= 640) {
      testInfo.skip();
      return;
    }
    await page.goto("/en/lenses");
    // Ensure the lens list has rendered enough content to be scrollable
    await waitForScrollable(page, 200);
  });

  test("nav is visible on page load", async ({ page }) => {
    const header = page.locator("header").first();
    const isOnScreen = await header.evaluate((el) => el.getBoundingClientRect().bottom > 0);
    expect(isOnScreen).toBe(true);
  });

  test("nav hides after scrolling down past threshold", async ({ page }) => {
    await scrollBy(page, 300);
    // Assert on data-hidden (React state) rather than getBoundingClientRect — avoids
    // waiting for the 300ms CSS transition and is unaffected by Playwright's synthetic
    // scroll event timing in mobile emulation.
    const header = page.locator("header").first();
    await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 3000 });
  });

  test("nav reappears after scrolling back up", async ({ page }) => {
    const header = page.locator("header").first();

    await scrollBy(page, 300);
    await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 3000 });

    await scrollBy(page, -400);
    await expect(header).toHaveAttribute("data-hidden", "false", { timeout: 3000 });
  });

  test("nav resets to visible when navigating to a new page", async ({ page }) => {
    const header = page.locator("header").first();

    await scrollBy(page, 300);
    await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 3000 });

    await page.goto("/en/about");
    await expect(header).toHaveAttribute("data-hidden", "false", { timeout: 3000 });
  });
});

test.describe("Compare table phantom header", () => {
  // The phantom header is a sticky h-0 div that mirrors column names and floats
  // up once the real <thead> scrolls out of view. It also locks the nav hidden
  // (via lockNav) so two top-chrome elements never compete on mobile.
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/compare?ids=${LENS_A},${LENS_B}`);
    await page.locator('[data-testid="compare-phantom-header"]').waitFor({ state: "attached" });
    await waitForScrollable(page, 200);
  });

  test("phantom header is hidden when at the top of the page", async ({ page }) => {
    const phantom = page.locator('[data-testid="compare-phantom-header"]');
    await expect(phantom).toHaveAttribute("data-visible", "false");
  });

  test("phantom header appears after scrolling the table header out of view", async ({
    page,
  }) => {
    await scrollBy(page, 400);
    const phantom = page.locator('[data-testid="compare-phantom-header"]');
    await expect(phantom).toHaveAttribute("data-visible", "true", { timeout: 3000 });
  });

  test("phantom header hides again after scrolling back to top", async ({ page }) => {
    const phantom = page.locator('[data-testid="compare-phantom-header"]');

    await scrollBy(page, 400);
    await expect(phantom).toHaveAttribute("data-visible", "true", { timeout: 3000 });

    await scrollToTop(page);
    await expect(phantom).toHaveAttribute("data-visible", "false", { timeout: 3000 });
  });

  test("nav is locked hidden while phantom header is visible", async ({ page }) => {
    // On mobile, the phantom header locks the nav so they don't both occupy the top
    const viewport = page.viewportSize();
    if (!viewport || viewport.width >= 640) {
      // Nav auto-hide only applies on mobile — skip on desktop
      test.skip();
      return;
    }

    await scrollBy(page, 400);
    const phantom = page.locator('[data-testid="compare-phantom-header"]');
    await expect(phantom).toHaveAttribute("data-visible", "true", { timeout: 3000 });

    const header = page.locator("header").first();
    await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 3000 });
  });
});

test.describe("Compare page share FAB", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/compare?ids=${LENS_A},${LENS_B}`);
    // Wait for the FAB to be rendered before any interaction
    await page.locator('[data-testid="compare-share-fab"]').waitFor({ state: "attached" });
  });

  test("FAB is hidden when header is in view", async ({ page }) => {
    const fab = page.locator('[data-testid="compare-share-fab"]');
    await expect(fab).toHaveAttribute("aria-hidden", "true");
  });

  test("FAB appears after scrolling header out of view", async ({ page }) => {
    await scrollBy(page, 300);

    const fab = page.locator('[data-testid="compare-share-fab"]');
    await expect(fab).toHaveAttribute("aria-hidden", "false", { timeout: 3000 });
  });

  test("FAB hides again after scrolling back to top", async ({ page }) => {
    // Show FAB
    await scrollBy(page, 300);
    const fab = page.locator('[data-testid="compare-share-fab"]');
    await expect(fab).toHaveAttribute("aria-hidden", "false", { timeout: 3000 });

    // Hide FAB by returning to top
    await scrollToTop(page);
    await expect(fab).toHaveAttribute("aria-hidden", "true", { timeout: 3000 });
  });
});

test.describe("Lens list scroll-to-top button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await waitForScrollable(page, 200);
    // Wait for React hydration of LensListClient (which owns the scroll listener)
    // before asserting scroll-driven state changes.
    await page.waitForLoadState("networkidle");
  });

  test("scroll-to-top button is hidden at page top", async ({ page }) => {
    const btn = page.getByRole("button", { name: /back to top/i });
    await expect(btn).toBeHidden();
  });

  test("scroll-to-top button appears after scrolling down", async ({ page }) => {
    await scrollBy(page, 500);
    const btn = page.getByRole("button", { name: /back to top/i });
    await expect(btn).toBeVisible({ timeout: 3000 });
  });

  test("clicking scroll-to-top returns to top", async ({ page }) => {
    await scrollBy(page, 500);
    const btn = page.getByRole("button", { name: /back to top/i });
    await expect(btn).toBeVisible({ timeout: 3000 });
    await btn.click();
    await page.waitForFunction(() => window.scrollY < 50, { timeout: 3000 });
    await expect(btn).toBeHidden({ timeout: 3000 });
  });
});
