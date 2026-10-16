import { expect, test } from "@playwright/test";

test.describe("Ask Iris side panel", () => {
  test.beforeEach(({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");
  });

  test("opens from the nav beside the page, follows navigation, and closes", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    await page.getByRole("banner").getByRole("link", { name: /^Ask Iris/ }).click();

    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel).toBeVisible();
    await expect(page).toHaveURL(/\/en\/lenses\/x\/browse$/);
    const pagePadding = await page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--iris-panel-width"),
    );
    expect(pagePadding).toBe("400px");

    // A client-side navigation keeps the panel and its conversation.
    await page.locator('a[href^="/en/lenses/x/"]:not([href$="/browse"]):not([href*="/collections"])').first().click();
    await expect(page).not.toHaveURL(/\/browse$/);
    await expect(panel).toBeVisible();

    await panel.getByRole("button", { name: "Close" }).click();
    await expect(panel).toBeHidden();
  });
});
