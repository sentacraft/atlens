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

const TAB_BAR = 56; // the phone tab bar above the home indicator

test.describe("Tab bar and compare bar bottom inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("the tab bar pads the home indicator and stands that much taller", async ({ page }) => {
    const tabBar = page.getByRole("navigation", { name: "Main" });
    await expect(tabBar).toBeVisible();
    const { paddingBottom, height, bottom } = await tabBar.evaluate((el) => ({
      paddingBottom: parseFloat(getComputedStyle(el).paddingBottom),
      height: el.getBoundingClientRect().height,
      bottom: el.getBoundingClientRect().bottom,
    }));
    expect(paddingBottom).toBe(HOME_BAR);
    expect(height).toBe(TAB_BAR + HOME_BAR);
    expect(bottom).toBe(page.viewportSize()!.height);
  });

  test("the compare bar sits on the tab bar, which already clears the home indicator", async ({ page }) => {
    // Below 499px only the icon button is visible.
    const addBtn = page.getByRole("button", { name: /add to compare/i }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    const bar = page.locator('[data-testid="compare-bar"]');
    await bar.waitFor({ state: "visible" });
    await expect.poll(() => bar.evaluate((el) => el.getBoundingClientRect().bottom)).toBe(
      page.viewportSize()!.height - TAB_BAR - HOME_BAR,
    );

    const { paddingBottom, cssVar, domHeight } = await bar.evaluate((el) => ({
      paddingBottom: parseFloat(getComputedStyle(el).paddingBottom),
      cssVar: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--compare-bar-height")),
      domHeight: el.getBoundingClientRect().height,
    }));
    expect(paddingBottom).toBe(0);
    expect(Math.abs(cssVar - domHeight)).toBeLessThanOrEqual(1);
  });
});

test.describe("Layout body bottom inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
  });

  test("page body wrapper paddingBottom clears the tab bar and the home indicator", async ({ page }) => {
    const paddingBottom = await page.evaluate(() => {
      const el = document.querySelector(".pt-\\[var\\(--nav-height\\)\\]");
      if (!el) {
        throw new Error("Layout wrapper not found");
      }
      return parseFloat(getComputedStyle(el).paddingBottom);
    });
    expect(paddingBottom).toBe(TAB_BAR + HOME_BAR);
  });
});

test.describe("Drawer bottom inset", () => {
  test("the drawer may reach 2.5rem below the notch, on what is visible now", async ({ page }) => {
    // A full-height iPhone screen, where the old 85% cap fell short of this one.
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    await simulateNotch(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitem", { name: "Support Atlens" }).click();

    const drawer = page.locator('[data-slot="dialog-content"]');
    await expect(drawer).toBeVisible();
    const { maxHeight, visibleHeight } = await drawer.evaluate((el) => {
      const probe = document.createElement("div");
      probe.style.height = "var(--visible-height)";
      document.body.append(probe);
      const visibleHeight = probe.getBoundingClientRect().height;
      probe.remove();
      return { maxHeight: parseFloat(getComputedStyle(el).maxHeight), visibleHeight };
    });
    expect(maxHeight).toBeCloseTo(visibleHeight - NOTCH_TOP - 40, 0);
  });
});
