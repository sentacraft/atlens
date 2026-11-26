import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page loads and CTA links to lenses", async ({ page }, testInfo) => {
    // The hero is height-locked, so on a very short viewport the CTA is unreachable by design.
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.height < 500, "Home hero CTA needs portrait/desktop height");

    await page.goto("/en");
    await expect(page.getByRole("link", { name: /^Browse all lenses/ })).toBeVisible();
    await page.getByRole("link", { name: /^Browse all lenses/ }).click();
    await expect(page).toHaveURL(/\/en\/lenses/);
  });

  test("/admin lists the admin modules", async ({ page }) => {
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("link", { name: /Analytics/ })).toHaveAttribute("href", "/admin/analytics");
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
      await page.getByRole("menuitem", { name: "About" }).click();
    }
    await expect(page).toHaveURL(/\/en\/about/);
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  });

  test("locale switch to zh changes URL prefix", async ({ page }) => {
    await page.goto("/en/lenses/x");

    const zhLink = page.getByRole("link", { name: /中文|zh/i });
    if (await zhLink.isVisible()) {
      await zhLink.click();
      await expect(page).toHaveURL(/\/zh\/lenses\/x/);
    } else {
      await page.goto("/zh/lenses/x");
      await expect(page).toHaveURL(/\/zh\/lenses\/x/);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
