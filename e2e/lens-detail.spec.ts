import { test, expect } from "@playwright/test";
import { LENS_CARD_LINK } from "./helpers";

const LENS_ID = "fujifilm-mkx-18-55mmt29-x";
const LENS_MODEL = "MKX 18-55mmT2.9";

test.describe("Lens detail page", () => {
  test("shows the lens's name and key specs, and adds it to compare", async ({ page }) => {
    await page.goto(`/en/lenses/x/${LENS_ID}`, { waitUntil: "networkidle" });
    // The model is also in the breadcrumb.
    await expect(page.getByRole("heading", { name: new RegExp(LENS_MODEL) })).toBeVisible();
    await expect(page.getByText("Focal Length").first()).toBeVisible();
    await expect(page.getByText("Max Aperture").first()).toBeVisible();

    await page.getByRole("button", { name: "Add to Compare", exact: true }).click();
    await expect(page.getByRole("button", { name: /Compare \(1\)/i })).toBeVisible();
  });

  test("a card opens its lens page, and Back returns to the list", async ({ page }) => {
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
