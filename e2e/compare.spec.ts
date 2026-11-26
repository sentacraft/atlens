import { test, expect } from "@playwright/test";

const LENS_A = "fujifilm-mkx-18-55mmt29-x";
const LENS_B = "fujifilm-mkx-50-135mmt29-x";
const LENS_A_MODEL = "MKX 18-55mmT2.9";
const LENS_B_MODEL = "MKX 50-135mmT2.9";

test.describe("Compare flow", () => {
  test("the compare bar counts, removes, clears and opens the compare page", async ({ page }) => {
    await page.goto("/en/lenses/x");

    const addButtons = page.getByRole("button", { name: /Add to Compare/i });
    const compareTwo = page.getByRole("button", { name: /Compare \(2\)/i });
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(compareTwo).toBeVisible();

    await page.getByRole("button", { name: /^Remove /i }).first().click();
    await expect(page.getByRole("button", { name: /Compare \(1\)/i })).toBeVisible();

    await page.getByRole("button", { name: /Clear/i }).click();
    await expect(page.getByRole("button", { name: /Compare \(/i })).not.toBeVisible();

    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await compareTwo.click();

    await expect(page).toHaveURL(/\/en\/lenses\/x\/compare\?ids=/);
    // Commas stay literal in the address bar.
    expect(page.url()).not.toContain("%2C");
  });

  // Regression: Context seeding must not clobber a mutation on the next render.
  test("the compare page shows its lenses, and swaps and removes columns", async ({ page }) => {
    await page.goto(`/en/lenses/x/compare?ids=${LENS_A},${LENS_B}`);

    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page.getByText(LENS_B_MODEL).first()).toBeVisible();
    const shared = page.locator("section").filter({ has: page.getByRole("heading", { name: "Featured In" }) });
    await expect(shared.getByRole("link", { name: /lenses ·/ }).first()).toBeVisible();

    await page.locator('button[aria-label="Move left"]:not([disabled])').first().click();
    await expect(page).toHaveURL(new RegExp(`ids=${LENS_B},${LENS_A}`));

    // Controls are hover-revealed on desktop.
    await page.getByRole("button", { name: new RegExp(`Remove .*${LENS_B_MODEL}`, "i") }).click();

    await expect(page.getByText(LENS_B_MODEL)).toHaveCount(0);
    await expect(page.getByText(LENS_A_MODEL).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`ids=${LENS_A}(?!,)`));
  });
});
