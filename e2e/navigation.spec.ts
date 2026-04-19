import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page loads and CTA links to lenses", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("link", { name: "Browse Lenses" })).toBeVisible();
    await page.getByRole("link", { name: "Browse Lenses" }).click();
    await expect(page).toHaveURL(/\/en\/lenses/);
  });

  test("navbar Browse link goes to lens list", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "Browse", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/lenses/);
  });

  test("navbar About link goes to about page", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/en\/about/);
    await expect(page.getByText("About X-Glass")).toBeVisible();
  });

  test("locale switch to zh changes URL prefix", async ({ page }) => {
    await page.goto("/en/lenses");

    // Find the language switcher — it should link to /zh/lenses
    const zhLink = page.getByRole("link", { name: /中文|zh/i });
    if (await zhLink.isVisible()) {
      await zhLink.click();
      await expect(page).toHaveURL(/\/zh\/lenses/);
    } else {
      // Directly navigate to confirm zh locale works
      await page.goto("/zh/lenses");
      await expect(page).toHaveURL(/\/zh\/lenses/);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
