import { test, expect } from "@playwright/test";

test.describe("Focal range filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
  });

  test("focal category chip narrows results", async ({ page }) => {
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    // "Standard" (24–50mm) is a stable focal category chip label
    await page.getByRole("button", { name: /^Standard/ }).click();

    const filteredText = await page.getByText(/\d+ lenses/).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
  });

  test("combining brand and focal filters compounds correctly", async ({ page }) => {
    await page.getByRole("button", { name: "Sigma", exact: true }).click();
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
    // Grab the first card href with default (asc) order
    const firstCardAsc = await page
      .locator('a[href*="/en/lenses/"]:not([href="/en/lenses"]):not([href*="/compare"])')
      .first()
      .getAttribute("href");

    // Click the sort direction toggle button
    await page.getByRole("button", { name: /ascending|descending/i }).click();

    // Wait for the grid to re-render
    await page.waitForTimeout(200);

    const firstCardDesc = await page
      .locator('a[href*="/en/lenses/"]:not([href="/en/lenses"]):not([href*="/compare"])')
      .first()
      .getAttribute("href");

    expect(firstCardDesc).not.toBe(firstCardAsc);
  });
});
