import { test, expect } from "@playwright/test";

const LENS_ID = "fujifilm-mkx-18-55mmt29-x";
const LENS_MODEL = "MKX 18-55mmT2.9";

test.describe("Lens detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/x/${LENS_ID}`);
  });

  test("shows lens model name", async ({ page }) => {
    // The model appears in both the breadcrumb and the <h1>; assert on the
    // heading to keep the match unambiguous.
    await expect(
      page.getByRole("heading", { name: new RegExp(LENS_MODEL) })
    ).toBeVisible();
  });

  test("shows key spec fields", async ({ page }) => {
    // Core spec labels should be present on detail page
    await expect(page.getByText("Focal Length").first()).toBeVisible();
    await expect(page.getByText("Max Aperture").first()).toBeVisible();
  });

  test("add to compare button is present", async ({ page }) => {
    // The detail-page toggle's accessible name is "Compare" (list cards say
    // "Add to Compare"; this is the compact detail variant).
    await expect(
      page.getByRole("button", { name: "Compare", exact: true })
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
