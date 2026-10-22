import { test, expect } from "@playwright/test";
import { LENS_CARD_LINK } from "./helpers";

const LENS_ID = "fujifilm-mkx-18-55mmt29-x";
const LENS_MODEL = "MKX 18-55mmT2.9";

test.describe("Lens detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/en/lenses/x/${LENS_ID}`);
  });

  test("shows lens model name", async ({ page }) => {
    // The model is also in the breadcrumb.
    await expect(
      page.getByRole("heading", { name: new RegExp(LENS_MODEL) })
    ).toBeVisible();
  });

  test("shows key spec fields", async ({ page }) => {
    await expect(page.getByText("Focal Length").first()).toBeVisible();
    await expect(page.getByText("Max Aperture").first()).toBeVisible();
  });

  test("add to compare button is present", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Compare", exact: true })
    ).toBeVisible();
  });

  test("back navigation returns to lens list", async ({ page }) => {
    await page.goto("/en/lenses");
    await page.waitForURL(/\/en\/lenses\/x\/browse/);
    const firstCard = page
      .locator(LENS_CARD_LINK)
      .first();
    await firstCard.click();
    await page.waitForURL(/\/en\/lenses\/x\/(?!browse)[^/?]+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/en\/lenses\/x\/browse/);
  });
});
