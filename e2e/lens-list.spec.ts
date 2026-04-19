import { test, expect } from "@playwright/test";

test.describe("Lens list page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
  });

  test("loads lens cards", async ({ page }) => {
    // At least one lens card link should be present
    const cards = page.locator('a[href*="/en/lenses/"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(10);
  });

  test("shows result count", async ({ page }) => {
    // e.g. "121 lenses"
    await expect(page.getByText(/\d+ lenses/)).toBeVisible();
  });

  test("brand filter narrows results", async ({ page }) => {
    // Get baseline count
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    // Click the "Sigma" brand chip
    await page.getByRole("button", { name: "Sigma", exact: true }).click();

    // Count should be smaller than total
    const filteredText = await page.getByText(/\d+ lenses/).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeLessThan(totalCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test("clear filters restores full count", async ({ page }) => {
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    // Apply a filter
    await page.getByRole("button", { name: "Sigma", exact: true }).click();

    // Clear it
    await page.getByRole("button", { name: "Clear Filters" }).click();

    const restoredText = await page.getByText(/\d+ lenses/).textContent();
    const restoredCount = parseInt(restoredText!.match(/\d+/)![0], 10);
    expect(restoredCount).toBe(totalCount);
  });

  test("clicking a lens card navigates to detail page", async ({ page }) => {
    // Click the first lens card link (exclude list page and compare page)
    const firstCard = page
      .locator('a[href*="/en/lenses/"]:not([href="/en/lenses"]):not([href*="/compare"])')
      .first();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();

    await expect(page).toHaveURL(new RegExp(href!));
    // Detail page shows the lens model — at least one visible text element is present
    await expect(page.locator("body")).toBeVisible();
  });
});
