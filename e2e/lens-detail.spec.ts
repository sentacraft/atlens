import { test, expect } from "@playwright/test";

const LENS_ID = "fujifilm-mkx-18-55mmt29-xf";
const LENS_MODEL = "MKX 18-55mmT2.9";

test.describe("Lens detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/${LENS_ID}`);
  });

  test("shows lens model name", async ({ page }) => {
    await expect(page.getByText(LENS_MODEL)).toBeVisible();
  });

  test("shows key spec fields", async ({ page }) => {
    // Core spec labels should be present on detail page
    await expect(page.getByText("Focal Length").first()).toBeVisible();
    await expect(page.getByText("Max Aperture").first()).toBeVisible();
  });

  test("add to compare button is present", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Add to Compare/i })
    ).toBeVisible();
  });

  test("back navigation returns to lens list", async ({ page }) => {
    // Navigate from list → detail → back
    await page.goto("/en/lenses");
    const firstCard = page
      .locator('a[href*="/en/lenses/"]:not([href="/en/lenses"])')
      .first();
    await firstCard.click();
    await page.goBack();
    await page.waitForURL(/\/en\/lenses/);
    await expect(page).toHaveURL(/\/en\/lenses/);
  });
});
