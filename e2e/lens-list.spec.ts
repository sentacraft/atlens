import { test, expect } from "@playwright/test";
import { LENS_CARD_LINK, selectBrandFilter } from "./helpers";

const RESULT_COUNT_RE = /\d+ (lenses|支镜头)/;

test.describe("Lens list page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses/x");
  });

  test("loads lens cards", async ({ page }) => {
    const cards = page.locator(LENS_CARD_LINK);
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(10);
  });

  test("shows result count", async ({ page }) => {
    await expect(page.getByText(RESULT_COUNT_RE)).toBeVisible();
  });

  test("brand filter narrows results", async ({ page }) => {
    const countText = await page.getByText(RESULT_COUNT_RE).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    await selectBrandFilter(page, "Sigma");

    const filteredText = await page.getByText(RESULT_COUNT_RE).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeLessThan(totalCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test("clear filters restores full count", async ({ page }) => {
    const countText = await page.getByText(RESULT_COUNT_RE).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    await selectBrandFilter(page, "Sigma");

    await page.getByRole("button", { name: "Reset" }).click();

    const restoredText = await page.getByText(RESULT_COUNT_RE).textContent();
    const restoredCount = parseInt(restoredText!.match(/\d+/)![0], 10);
    expect(restoredCount).toBe(totalCount);
  });

  test("clicking a lens card navigates to detail page", async ({ page }) => {
    const firstCard = page
      .locator(LENS_CARD_LINK)
      .first();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();

    await expect(page).toHaveURL(new RegExp(href!));
    await expect(page.locator("body")).toBeVisible();
  });

  // Regression: filters sync to the URL with replaceState, so refresh and Back keep them.
  test("applying a brand filter writes it into the URL synchronously", async ({
    page,
  }) => {
    await expect(page).toHaveURL(/\/lenses\/x\/browse$/);

    await selectBrandFilter(page, "Sigma");

    await expect(page).toHaveURL(/[?&]b=sigma\b/i, { timeout: 500 });

    // No new history entry.
    await expect(page).toHaveURL(/\/lenses\/x\/browse\?/);
  });

  test("filter state survives a page refresh", async ({ page }) => {
    await selectBrandFilter(page, "Sigma");
    await expect(page).toHaveURL(/[?&]b=sigma\b/i);

    await page.reload();

    const filteredText = await page.getByText(RESULT_COUNT_RE).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(50);
  });
});
