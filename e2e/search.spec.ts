import { test, expect } from "@playwright/test";

test.describe("Lens search dialog", () => {
  test("finds lenses as a query is typed, clears, and opens the first result on Enter", async ({ page }) => {
    await page.goto("/en/lenses/x");
    await page.getByRole("button", { name: /search/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const input = dialog.locator("input[type='text']");
    const listbox = page.getByRole("listbox");
    await input.fill("35mm");
    await expect(listbox.getByRole("option").first()).toBeVisible();

    await dialog.getByRole("button", { name: /clear search/i }).click();
    await expect(listbox).not.toBeVisible();

    await input.fill("50mm");
    await expect(listbox.getByRole("option").first()).toBeVisible();
    await input.press("Enter");
    await expect(page).toHaveURL(/\/en\/lenses\/x\/[^/]+$/);
  });
});
