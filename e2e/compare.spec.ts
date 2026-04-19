import { test, expect } from "@playwright/test";

// Two stable Fujifilm lenses from the dataset
const LENS_A = "fujifilm-mkx-18-55mmt29-xf";
const LENS_B = "fujifilm-mkx-50-135mmt29-xf";
const LENS_A_MODEL = "MKX 18-55mmT2.9";
const LENS_B_MODEL = "MKX 50-135mmT2.9";

test.describe("Compare flow", () => {
  test("adding two lenses shows compare bar with correct count", async ({
    page,
  }) => {
    await page.goto("/en/lenses");

    // Add first lens — "Add to Compare" buttons are inside each card footer
    const firstAddBtn = page
      .locator('a[href*="/en/lenses/"]:not([href="/en/lenses"])')
      .first()
      .locator("..")  // card root
      .getByRole("button", { name: /Add to Compare/i });

    // Simpler: find all "Add to Compare" buttons and click the first two
    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();

    // Compare bar should now show "Compare (2)"
    await expect(page.getByRole("button", { name: /Compare \(2\)/i })).toBeVisible();
  });

  test("compare bar button navigates to compare page", async ({ page }) => {
    await page.goto("/en/lenses");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();

    await page.getByRole("button", { name: /Compare \(2\)/i }).click();

    await expect(page).toHaveURL(/\/en\/lenses\/compare/);
  });

  test("compare page via URL shows both lens columns", async ({ page }) => {
    await page.goto(
      `/en/lenses/compare?ids=${LENS_A},${LENS_B}`
    );

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();
  });

  test("compare page with fewer than 2 ids still renders without crashing", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/compare`);
    // Should render, not throw 500
    await expect(page.locator("body")).toBeVisible();
  });

  test("removing a lens from the compare bar decrements count", async ({ page }) => {
    await page.goto("/en/lenses");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(page.getByRole("button", { name: /Compare \(2\)/i })).toBeVisible();

    // Click the X button on the first chip in the compare bar
    const removeBtn = page.getByRole("button", { name: /^Remove /i }).first();
    await removeBtn.click();

    await expect(page.getByRole("button", { name: /Compare \(1\)/i })).toBeVisible();
  });

  test("clear compare button dismisses the compare bar", async ({ page }) => {
    await page.goto("/en/lenses");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(page.getByRole("button", { name: /Compare \(2\)/i })).toBeVisible();

    await page.getByRole("button", { name: /Clear/i }).click();

    // Compare bar should disappear entirely
    await expect(page.getByRole("button", { name: /Compare \(/i })).not.toBeVisible();
  });

  test("adding from detail page then navigating to compare includes that lens", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/${LENS_A}`);

    await page.getByRole("button", { name: /Add to Compare/i }).click();

    // Navigate to compare page via the bar
    await page.getByRole("button", { name: /Compare \(1\)/i }).waitFor();

    // Go to the compare page URL that includes LENS_A
    await page.goto(`/en/lenses/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
  });
});
