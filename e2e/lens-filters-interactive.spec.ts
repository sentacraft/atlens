import { test, expect } from "@playwright/test";
import { openSecondaryFilters, selectBrandFilter } from "./helpers";

test.describe("Focal range filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
    await openSecondaryFilters(page);
  });

  test("focal category chip narrows results", async ({ page }) => {
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    await page.getByRole("button", { name: /^Standard/ }).click();

    const filteredText = await page.getByText(/\d+ lenses/).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
  });

  test("combining brand and focal filters compounds correctly", async ({ page }) => {
    await selectBrandFilter(page, "Sigma");
    const sigmaText = await page.getByText(/\d+ lenses/).textContent();
    const sigmaCount = parseInt(sigmaText!.match(/\d+/)![0], 10);

    await page.getByRole("button", { name: /^Standard/ }).click();
    const combinedText = await page.getByText(/\d+ lenses/).textContent();
    const combinedCount = parseInt(combinedText!.match(/\d+/)![0], 10);

    expect(combinedCount).toBeLessThanOrEqual(sigmaCount);
  });
});

test.describe("Sort controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
  });

  test("toggling sort direction reverses card order", async ({ page }) => {
    const firstCardAsc = await page
      .locator('a[href^="/en/lenses/x/"]:not([href$="/browse"]):not([href$="/collections"]):not([href*="/compare"])')
      .first()
      .getAttribute("href");

    await page.getByRole("button", { name: /ascending|descending/i }).click();

    await page.waitForTimeout(200);

    const firstCardDesc = await page
      .locator('a[href^="/en/lenses/x/"]:not([href$="/browse"]):not([href$="/collections"]):not([href*="/compare"])')
      .first()
      .getAttribute("href");

    expect(firstCardDesc).not.toBe(firstCardAsc);
  });
});
