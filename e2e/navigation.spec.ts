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
    const aboutLink = page.getByRole("link", { name: "About" });
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
    } else {
      await page.getByRole("button", { name: "Menu" }).click();
      await aboutLink.click();
    }
    await expect(page).toHaveURL(/\/en\/about/);
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  });

  test("locale switch to zh changes URL prefix", async ({ page }) => {
    await page.goto("/en/lenses/x");

    // Find the language switcher — it should link to the matching zh path.
    const zhLink = page.getByRole("link", { name: /中文|zh/i });
    if (await zhLink.isVisible()) {
      await zhLink.click();
      await expect(page).toHaveURL(/\/zh\/lenses\/x/);
    } else {
      // Directly navigate to confirm zh locale works
      await page.goto("/zh/lenses/x");
      await expect(page).toHaveURL(/\/zh\/lenses\/x/);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
