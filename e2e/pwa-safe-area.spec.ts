// Overrides the --safe-inset-* variables to simulate a notch; real devices supply env().

import { type Page, test, expect } from "@playwright/test";

const NOTCH_TOP = 59; // Dynamic Island region height
const HOME_BAR = 34; // home indicator bar height

async function simulateNotch(page: Page) {
  await page.addStyleTag({
    content: `:root {
      --safe-inset-top: ${NOTCH_TOP}px;
      --safe-inset-bottom: ${HOME_BAR}px;
    }`,
  });
}

async function computedPx(page: Page, selector: string, property: string): Promise<number> {
  return page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel as string);
      if (!el) {
        throw new Error(`Element not found: ${sel}`);
      }
      return parseFloat(getComputedStyle(el).getPropertyValue(prop as string));
    },
    [selector, property]
  );
}

const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";

test.describe("Nav top inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("nav paddingTop equals --safe-inset-top when --titlebar-height is 0", async ({ page }) => {
    // No WCO in an iPhone standalone PWA, so --titlebar-height stays 0.
    const paddingTop = await computedPx(page, "header", "padding-top");
    expect(paddingTop).toBe(NOTCH_TOP);
  });

});

test.describe("Compare phantom header top inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);
    await page.locator('[data-testid="compare-phantom-header"]').waitFor({ state: "attached" });
    await simulateNotch(page);
  });

  test("sticky container top equals --safe-inset-top on mobile viewport", async ({ page }) => {
    const top = await computedPx(page, '[data-testid="compare-phantom-container"]', "top");
    expect(top).toBe(NOTCH_TOP);
  });
});

test.describe("CompareBar bottom inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("compare bar paddingBottom equals --safe-inset-bottom", async ({ page }) => {
    // Below 499px only the icon button is visible.
    const addBtn = page.getByRole("button", { name: /add to compare/i }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    const bar = page.locator('[data-testid="compare-bar"]');
    await bar.waitFor({ state: "attached" });

    const paddingBottom = await computedPx(page, '[data-testid="compare-bar"]', "padding-bottom");
    expect(paddingBottom).toBe(HOME_BAR);
  });

  test("--compare-bar-height includes safe-area padding (border-box)", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add to compare/i }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    const bar = page.locator('[data-testid="compare-bar"]');
    await bar.waitFor({ state: "visible" });

    const [cssVar, domHeight] = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="compare-bar"]') as HTMLElement;
      const varVal = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--compare-bar-height")
      );
      return [varVal, el.getBoundingClientRect().height];
    });

    expect(Math.abs(cssVar - domHeight)).toBeLessThanOrEqual(1);
    expect(cssVar).toBeGreaterThanOrEqual(HOME_BAR);
  });
});

test.describe("Layout body bottom inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("page body wrapper paddingBottom equals --safe-inset-bottom", async ({ page }) => {
    const paddingBottom = await page.evaluate(() => {
      const el = document.querySelector(".pt-\\[var\\(--nav-height\\)\\]");
      if (!el) {
        throw new Error("Layout wrapper not found");
      }
      return parseFloat(getComputedStyle(el).paddingBottom);
    });
    expect(paddingBottom).toBe(HOME_BAR);
  });
});

test.describe("Drawer bottom inset", () => {
  test("the home bar's padding comes on top of the drawer's 85% height, not out of it", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitem", { name: "Support Atlens" }).click();

    const drawer = page.locator('[data-slot="dialog-content"]');
    await expect(drawer).toBeVisible();
    const { maxHeight, appHeight } = await drawer.evaluate((el) => {
      const probe = document.createElement("div");
      probe.style.height = "var(--app-height)";
      document.body.append(probe);
      const appHeight = probe.getBoundingClientRect().height;
      probe.remove();
      return { maxHeight: parseFloat(getComputedStyle(el).maxHeight), appHeight };
    });
    // A short screen is capped by the notch instead: what is left once it and a 1rem gap are taken.
    expect(maxHeight).toBeCloseTo(Math.min(appHeight * 0.85 + HOME_BAR, appHeight - NOTCH_TOP - 16), 0);
  });
});
