import { type Page, test, expect } from "@playwright/test";

const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";

async function getCompareBarHeightVar(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--compare-bar-height").trim();
    return parseFloat(raw) || 0;
  });
}

// window.scrollBy fires a real window scroll event, which Nav listens to.
async function scrollBy(page: import("@playwright/test").Page, deltaY: number) {
  await page.evaluate((dy) => window.scrollBy(0, dy), deltaY);
  await page.waitForTimeout(50);
}

async function scrollToTop(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
}

// Scrolls to the bottom: a fixed scrollBy is viewport-dependent.
async function scrollToBottom(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(50);
}

async function waitForScrollable(page: import("@playwright/test").Page, minDelta = 200) {
  await page.waitForFunction(
    (minY) => document.documentElement.scrollHeight > window.innerHeight + minY,
    minDelta,
    { timeout: 10000 }
  );
}

test.describe("Nav auto-hide (mobile only)", () => {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width >= 640) {
      testInfo.skip();
      return;
    }
    // WebKit's emulated programmatic scroll does not reliably drive direction detection.
    testInfo.skip(browserName === "webkit", "Nav auto-hide is flaky under WebKit emulated scroll");
    await page.goto("/en/lenses");
    await waitForScrollable(page, 200);
  });

  test("nav is visible on page load", async ({ page }) => {
    const header = page.locator("header").first();
    const isOnScreen = await header.evaluate((el) => el.getBoundingClientRect().bottom > 0);
    expect(isOnScreen).toBe(true);
  });

  test("nav hides after scrolling down past threshold", async ({ page }) => {
    await scrollBy(page, 300);
    // data-hidden, not geometry: avoids waiting on the 300ms transition.
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

// @local-only: cosmetic scroll choreography with slow settle waits; excluded from CI.
test.describe("Compare table phantom header", { tag: "@local-only" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);
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
    await scrollToBottom(page);
    const phantom = page.locator('[data-testid="compare-phantom-header"]');
    await expect(phantom).toHaveAttribute("data-visible", "true", { timeout: 3000 });
  });

  test("phantom header hides again after scrolling back to top", async ({ page }) => {
    const phantom = page.locator('[data-testid="compare-phantom-header"]');

    await scrollToBottom(page);
    await expect(phantom).toHaveAttribute("data-visible", "true", { timeout: 3000 });

    await scrollToTop(page);
    await expect(phantom).toHaveAttribute("data-visible", "false", { timeout: 3000 });
  });

  test("nav is locked hidden while phantom header is visible", async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width >= 640) {
      test.skip();
      return;
    }

    await scrollToBottom(page);
    const phantom = page.locator('[data-testid="compare-phantom-header"]');
    await expect(phantom).toHaveAttribute("data-visible", "true", { timeout: 3000 });

    const header = page.locator("header").first();
    await expect(header).toHaveAttribute("data-hidden", "true", { timeout: 3000 });
  });
});

test.describe("Compare page share FAB", { tag: "@local-only" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);
    await page.locator('[data-testid="share-fab"]').waitFor({ state: "attached" });
  });

  test("FAB is hidden when header is in view", async ({ page }) => {
    const fab = page.locator('[data-testid="share-fab"]');
    await expect(fab).toHaveAttribute("aria-hidden", "true");
  });

  test("FAB appears after scrolling header out of view", async ({ page }) => {
    await scrollToBottom(page);

    const fab = page.locator('[data-testid="share-fab"]');
    await expect(fab).toHaveAttribute("aria-hidden", "false", { timeout: 3000 });
  });

  test("FAB hides again after scrolling back to top", async ({ page }) => {
    await scrollToBottom(page);
    const fab = page.locator('[data-testid="share-fab"]');
    await expect(fab).toHaveAttribute("aria-hidden", "false", { timeout: 3000 });

    await scrollToTop(page);
    await expect(fab).toHaveAttribute("aria-hidden", "true", { timeout: 3000 });
  });
});

test.describe("Lens list scroll-to-top button", { tag: "@local-only" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await waitForScrollable(page, 200);
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

// Regression: the fixed CompareBar covered the last table rows and BackToTopButton on mobile.

test.describe("CompareBar --compare-bar-height CSS variable", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
  });

  test("variable is 0 when no lenses are selected", async ({ page }) => {
    const height = await getCompareBarHeightVar(page);
    expect(height).toBe(0);
  });

  test("variable becomes positive once compare bar appears", async ({ page }) => {
    await page.getByRole("button", { name: /add to compare/i }).first().click();
    await page.locator('[data-testid="compare-bar"]').waitFor({ state: "visible" });

    const height = await getCompareBarHeightVar(page);
    expect(height).toBeGreaterThan(0);
  });

  test("variable resets to 0 after compare bar is dismissed", async ({ page }) => {
    await page.getByRole("button", { name: /add to compare/i }).first().click();
    const bar = page.locator('[data-testid="compare-bar"]');
    await bar.waitFor({ state: "visible" });

    await page.getByRole("button", { name: /clear/i }).click();
    await page.waitForFunction(
      () =>
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--compare-bar-height")
        ) === 0,
      { timeout: 3000 }
    );

    const height = await getCompareBarHeightVar(page);
    expect(height).toBe(0);
  });

  test("variable accurately reflects the bar's rendered height", async ({ page }) => {
    await page.getByRole("button", { name: /add to compare/i }).first().click();
    const bar = page.locator('[data-testid="compare-bar"]');
    await bar.waitFor({ state: "visible" });

    const [cssVar, domHeight] = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="compare-bar"]') as HTMLElement;
      const varVal = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--compare-bar-height")
      );
      return [varVal, el.getBoundingClientRect().height];
    });

    // 1px tolerance between ResizeObserver and getBoundingClientRect.
    expect(Math.abs(cssVar - domHeight)).toBeLessThanOrEqual(1);
  });
});

test.describe("CompareBar does not obscure BackToTopButton or page content", () => {
  test("BackToTopButton uses fixed position above CompareBar", async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await waitForScrollable(page, 200);

    await page.getByRole("button", { name: /add to compare/i }).first().click();
    await page.locator('[data-testid="compare-bar"]').waitFor({ state: "visible" });

    await scrollBy(page, 500);
    const btn = page.getByRole("button", { name: /back to top/i });
    await expect(btn).toBeVisible({ timeout: 3000 });

    const [btnBottom, barTop] = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll("button[aria-label]"));
      const backTop = allBtns.find((b) =>
        (b.getAttribute("aria-label") ?? "").toLowerCase().includes("top")
      );
      const bar = document.querySelector('[data-testid="compare-bar"]') as HTMLElement;
      if (!backTop || !bar) {
        throw new Error("Elements not found");
      }
      return [
        backTop.getBoundingClientRect().bottom,
        bar.getBoundingClientRect().top,
      ];
    });

    expect(btnBottom).toBeLessThanOrEqual(barTop + 1);
  });

  test("lens list content padding-bottom exceeds compare bar height", async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /add to compare/i }).first().click();
    await page.locator('[data-testid="compare-bar"]').waitFor({ state: "visible" });

    const barHeight = await getCompareBarHeightVar(page);

    const paddingBottom = await page.evaluate(() => {
      // Scoped outside <header>: the nav also uses .max-w-7xl.
      const el = [...document.querySelectorAll(".max-w-7xl")].find(
        (e) => !e.closest("header")
      ) as HTMLElement | undefined;
      if (!el) {
        throw new Error("Lens list container not found");
      }
      return parseFloat(getComputedStyle(el).paddingBottom);
    });

    expect(paddingBottom).toBeGreaterThan(barHeight);
  });

  test("lens detail content padding-bottom exceeds compare bar height", async ({ page }) => {
    await page.goto(`/en/lenses/x/${LENS_A}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add to Compare", exact: true }).click();
    await page.locator('[data-testid="compare-bar"]').waitFor({ state: "visible" });

    const barHeight = await getCompareBarHeightVar(page);

    const paddingBottom = await page.evaluate(() => {
      const el = document.querySelector(".max-w-4xl") as HTMLElement;
      if (!el) {
        throw new Error("Lens detail container not found");
      }
      return parseFloat(getComputedStyle(el).paddingBottom);
    });

    expect(paddingBottom).toBeGreaterThan(barHeight);
  });
});
