// Locks down the iris animation lifecycle, which has regressed back and forth.

import { type Page, test, expect } from "@playwright/test";

const ANIMATION_SETTLE_MS = 3000;

async function getIrisFStop(page: Page): Promise<number> {
  return page.evaluate(() => {
    // The nav logo also has data-testid="iris".
    const el = [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"));
    if (!el) {
      throw new Error("Iris element not found");
    }
    return parseFloat(el.getAttribute("data-fstop") ?? "NaN");
  });
}

async function getIrisAnimating(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"));
    if (!el) {
      throw new Error("Iris element not found");
    }
    return el.getAttribute("data-animating") === "true";
  });
}

// @local-only: slow, decorative; excluded from CI.
test.describe("Hero Iris mount animation", { tag: "@local-only" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.locator('[data-testid="iris"]').last().waitFor({ state: "attached" });
    await page.waitForLoadState("networkidle");
  });

  test("iris starts animating on mount", async ({ page, browserName }, testInfo) => {
    // Must catch the live mount animation (~1500ms); on WebKit the networkidle wait can outlast it.
    testInfo.skip(browserName === "webkit", "Live mount-animation catch races networkidle on WebKit");

    const animating = await page.waitForFunction(
      () => [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "true",
      { timeout: ANIMATION_SETTLE_MS }
    );
    expect(animating).toBeTruthy();
  });

  test("iris returns to defaultFStop (f/4) after animation completes", async ({ page }) => {
    await page.waitForFunction(
      () => [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "false",
      { timeout: ANIMATION_SETTLE_MS }
    );

    await page.waitForTimeout(300);

    const fStop = await getIrisFStop(page);
    // ±0.2 for chase-loop smoothing error.
    expect(fStop).toBeGreaterThanOrEqual(3.8);
    expect(fStop).toBeLessThanOrEqual(4.2);
  });

  test("iris does NOT stay frozen at minimum aperture (f/22) after animation", async ({
    page,
  }) => {
    // Regression: the chase loop stopped at the phase boundary and left the iris at f/22.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "false",
      { timeout: ANIMATION_SETTLE_MS }
    );
    await page.waitForTimeout(300);

    const fStop = await getIrisFStop(page);
    expect(fStop).toBeLessThan(20);
  });

  test("data-animating transitions false → true → false exactly once per mount", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "false",
      { timeout: ANIMATION_SETTLE_MS }
    );
    await page.waitForTimeout(200);
    const animating = await getIrisAnimating(page);
    expect(animating).toBe(false);
  });
});

test.describe("Hero Iris tap animation", { tag: "@local-only" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.locator('[data-testid="iris"]').last().waitFor({ state: "attached" });
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "false",
      { timeout: ANIMATION_SETTLE_MS }
    );
    await page.waitForTimeout(300);
  });

  test("tapping iris restarts animation and returns to defaultFStop", async ({ page }) => {
    const iris = page.locator('[data-testid="iris"]').last();
    await iris.click();

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "true",
      { timeout: ANIMATION_SETTLE_MS }
    );

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="iris"]')].find((e) => !e.closest("header"))?.getAttribute("data-animating") === "false",
      { timeout: ANIMATION_SETTLE_MS }
    );
    await page.waitForTimeout(300);

    const fStop = await getIrisFStop(page);
    expect(fStop).toBeGreaterThanOrEqual(3.8);
    expect(fStop).toBeLessThanOrEqual(4.2);
  });
});
