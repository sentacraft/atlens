import { test, expect } from "@playwright/test";

test.describe("Lens search dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
  });

  test("opens dialog when search icon is clicked", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).click();
    // Dialog title should appear
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("typing a query shows matching results", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).click();
    await page.getByRole("dialog").waitFor();

    const input = page.getByRole("dialog").locator("input[type='text']");
    await input.fill("35mm");

    // At least one result should appear in the listbox
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    const results = listbox.getByRole("option");
    await expect(results.first()).toBeVisible();
  });

  test("selecting a result navigates to the lens detail page", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).click();
    await page.getByRole("dialog").waitFor();

    const input = page.getByRole("dialog").locator("input[type='text']");
    await input.fill("35mm");

    const listbox = page.getByRole("listbox");
    await expect(listbox.getByRole("option").first()).toBeVisible();

    // Click the first result
    await listbox.getByRole("option").first().click();

    // Should have navigated to a lens detail URL
    await expect(page).toHaveURL(/\/en\/lenses\/[^/]+$/);
  });

  test("keyboard Enter on first result navigates to detail page", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).click();
    await page.getByRole("dialog").waitFor();

    const input = page.getByRole("dialog").locator("input[type='text']");
    await input.fill("50mm");

    const listbox = page.getByRole("listbox");
    await expect(listbox.getByRole("option").first()).toBeVisible();

    await input.press("Enter");
    await expect(page).toHaveURL(/\/en\/lenses\/[^/]+$/);
  });

  test("clearing the query hides the results listbox", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).click();
    await page.getByRole("dialog").waitFor();

    const input = page.getByRole("dialog").locator("input[type='text']");
    await input.fill("50mm");
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.getByRole("dialog").getByRole("button", { name: /clear search/i }).click();
    await expect(page.getByRole("listbox")).not.toBeVisible();
  });

  test("Escape closes the dialog", async ({ page }) => {
    await page.getByRole("button", { name: /search/i }).click();
    await page.getByRole("dialog").waitFor();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
