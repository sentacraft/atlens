import { test, expect } from "@playwright/test";

const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";
const LENS_A_MODEL = "MKX 18-55mmT2.9";
const LENS_B_MODEL = "MKX 50-135mmT2.9";

test.describe("Compare flow", () => {
  test("adding two lenses shows compare bar with correct count", async ({
    page,
  }) => {
    await page.goto("/en/lenses/x");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();

    await expect(page.getByRole("button", { name: /Compare \(2\)/i })).toBeVisible();
  });

  test("compare bar button navigates to compare page", async ({ page }) => {
    await page.goto("/en/lenses/x");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();

    await page.getByRole("button", { name: /Compare \(2\)/i }).click();

    await expect(page).toHaveURL(/\/en\/lenses\/x\/compare/);
  });

  test("compare page via URL shows both lens columns", async ({ page }) => {
    await page.goto(
      `/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`
    );

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();
  });

  test("compare page links the collections both lenses share", async ({ page }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Featured In" }) });
    await expect(section.getByRole("link", { name: /lenses ·/ }).first()).toBeVisible();
  });

  test("compare page with fewer than 2 ids still renders without crashing", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x/compare`);
    await expect(page.locator("body")).toBeVisible();
  });

  test("removing a lens from the compare bar decrements count", async ({ page }) => {
    await page.goto("/en/lenses/x");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(page.getByRole("button", { name: /Compare \(2\)/i })).toBeVisible();

    const removeBtn = page.getByRole("button", { name: /^Remove /i }).first();
    await removeBtn.click();

    await expect(page.getByRole("button", { name: /Compare \(1\)/i })).toBeVisible();
  });

  test("clear compare button dismisses the compare bar", async ({ page }) => {
    await page.goto("/en/lenses/x");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(page.getByRole("button", { name: /Compare \(2\)/i })).toBeVisible();

    await page.getByRole("button", { name: /Clear/i }).click();

    await expect(page.getByRole("button", { name: /Compare \(/i })).not.toBeVisible();
  });

  test("adding from detail page then navigating to compare includes that lens", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x/${LENS_A}`);

    await page.getByRole("button", { name: "Compare", exact: true }).click();

    await page.getByRole("button", { name: /Compare \(1\)/i }).waitFor();

    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
  });

  // Regression: Context seeding must not clobber a mutation on the next render.
  test("removing a lens column from the compare table actually removes it", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();

    // Controls are hover-revealed on desktop.
    const secondColumnRemove = page
      .getByRole("button", { name: new RegExp(`Remove .*${LENS_B_MODEL}`, "i") });
    await secondColumnRemove.click();

    await expect(page.getByText(LENS_B_MODEL)).toHaveCount(0);
    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`ids=${LENS_A}(?!,)`));
  });

  test("shifting a lens column left swaps order and updates URL", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();

    const shiftLeft = page.locator('button[aria-label="Move left"]:not([disabled])').first();
    await shiftLeft.click();

    await expect(page).toHaveURL(new RegExp(`ids=${LENS_B},${LENS_A}`));
  });

  test("compare URL preserves commas literally (no %2C encoding)", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x`);

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();

    await page.getByRole("button", { name: /Compare \(2\)/i }).click();

    await page.waitForURL(/\/lenses\/[^/]+\/compare/);
    const url = page.url();
    expect(url).toContain("ids=");
    expect(url).not.toContain("%2C");
  });
});
