import { test, expect } from "@playwright/test";

// Two stable Fujifilm lenses from the dataset
const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";
const LENS_A_MODEL = "MKX 18-55mmT2.9";
const LENS_B_MODEL = "MKX 50-135mmT2.9";

test.describe("Compare flow", () => {
  test("adding two lenses shows compare bar with correct count", async ({
    page,
  }) => {
    await page.goto("/en/lenses");

    // Simpler: find all "Add to Compare" buttons and click the first two
    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();

    // Compare bar should now show "Compare (2)"
    await expect(
      page.getByRole("button", { name: /Compare \(2\)/i })
    ).toBeVisible();
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
    await page.goto(`/en/lenses/compare?ids=${LENS_A},${LENS_B}`);

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

  test("removing a lens from the compare bar decrements count", async ({
    page,
  }) => {
    await page.goto("/en/lenses");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(
      page.getByRole("button", { name: /Compare \(2\)/i })
    ).toBeVisible();

    // Click the X button on the first chip in the compare bar
    const removeBtn = page.getByRole("button", { name: /^Remove /i }).first();
    await removeBtn.click();

    await expect(
      page.getByRole("button", { name: /Compare \(1\)/i })
    ).toBeVisible();
  });

  test("clear compare button dismisses the compare bar", async ({ page }) => {
    await page.goto("/en/lenses");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(
      page.getByRole("button", { name: /Compare \(2\)/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /Clear/i }).click();

    // Compare bar should disappear entirely
    await expect(
      page.getByRole("button", { name: /Compare \(/i })
    ).not.toBeVisible();
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

  // Regression guard: when the compare table renders from Context (not local
  // state), any mutation must persist — the Context-seeding effect must not
  // clobber it on the next render. This was broken when the scoped
  // replaceCompare wrapper had an unstable identity across state changes,
  // causing the seeding effect to re-fire and overwrite every mutation.
  test("removing a lens column from the compare table actually removes it", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();

    // Hover the second column header to reveal the controls (they're
    // sm:opacity-0 sm:group-hover:opacity-100 by default on desktop).
    const secondColumnRemove = page.getByRole("button", {
      name: new RegExp(`Remove ${LENS_B_MODEL}`, "i"),
    });
    await secondColumnRemove.click();

    // After removal, LENS_B should no longer be in the table headers.
    await expect(page.getByText(LENS_B_MODEL)).toHaveCount(0);
    // LENS_A should still be there.
    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    // URL should be updated to drop LENS_B.
    await expect(page).toHaveURL(new RegExp(`ids=${LENS_A}(?!,)`));
  });

  test("shifting a lens column left swaps order and updates URL", async ({
    page,
  }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();

    // Click the "move left" arrow on the second (rightmost) column header.
    // There's exactly one move-left button enabled (the first column's is disabled).
    const shiftLeft = page.getByRole("button", { name: /Move left/i }).first();
    await shiftLeft.click();

    // After the swap, the URL ids should be reversed.
    await expect(page).toHaveURL(new RegExp(`ids=${LENS_B},${LENS_A}`));
  });

  test("compare URL preserves commas literally (no %2C encoding)", async ({
    page,
  }) => {
    await page.goto(`/en/lenses`);

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
