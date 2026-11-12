import { test, expect } from "@playwright/test";
import { LENS_CARD_LINK, openSecondaryFilters, selectBrandFilter } from "./helpers";

test.describe("Focal range filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
    await page.getByRole("radio", { name: "Equiv. range" }).click();
  });

  test("focal category chip narrows results", async ({ page }) => {
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    await page.getByRole("button", { name: "Standard 35–<70mm" }).click();

    const filteredText = await page.getByText(/\d+ lenses/).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
  });

  test("combining brand and focal filters compounds correctly", async ({ page }) => {
    await selectBrandFilter(page, "Sigma");
    const sigmaText = await page.getByText(/\d+ lenses/).textContent();
    const sigmaCount = parseInt(sigmaText!.match(/\d+/)![0], 10);

    await page.getByRole("button", { name: /^Standard/ }).click();
    const combinedText = await page.getByText(/\d+ lenses/).textContent();
    const combinedCount = parseInt(combinedText!.match(/\d+/)![0], 10);

    expect(combinedCount).toBeLessThanOrEqual(sigmaCount);
  });
});

test("actual focal coverage and aperture survive reload and can be cleared independently", async ({ page }) => {
  await page.goto("/en/lenses/x/browse");
  const focalLength = page.getByRole("textbox", { name: "Actual focal length in mm" });
  await focalLength.fill("27");
  const variableZoom = page.locator('a[href$="/fujifilm-xc-15-45mmf35-56-ois-pz-x"]');
  const prime = page.locator('a[href$="/fujifilm-xf-27mmf28-r-wr-x"]');
  const unrelatedPrime = page.locator('a[href$="/fujifilm-xf-23mmf2-r-wr-x"]');
  await expect(variableZoom).toHaveCount(1);
  await expect(prime).toHaveCount(1);
  await expect(unrelatedPrime).toHaveCount(0);

  await openSecondaryFilters(page);
  await page.getByRole("combobox", { name: "Max Aperture" }).click();
  await page.getByRole("option", { name: "f/3.5 or faster" }).click();
  await expect(page).toHaveURL(/fmm=27&ap=3.5/);
  await page.reload();
  await expect(focalLength).toHaveValue("27");
  await expect(variableZoom).toHaveCount(1);
  await page.getByRole("button", { name: "Clear max aperture" }).click();
  await expect(page).toHaveURL(/\?fmm=27$/);

  await page.getByRole("radio", { name: "Equiv. range" }).click();
  await page.getByRole("button", { name: "Standard 35–<70mm" }).click();
  await expect(page).toHaveURL(/\?fc=standard$/);
  await page.reload();
  await expect(page.getByRole("radio", { name: "Equiv. range" })).toBeChecked();
});

test("weight presets and custom limits combine with focal coverage and restore from links", async ({ page }) => {
  await page.goto("/en/lenses/x/browse?fmm=27");
  const rangeLens = page.locator('a[href$="/ttartisan-af-27mm-f28-x"]');
  const heavyLens = page.locator('a[href$="/viltrox-af-27mm-f12-pro-x"]');
  await expect(heavyLens).toHaveCount(1);

  await openSecondaryFilters(page);
  const weight = page.getByRole("combobox", { name: "Weight Limit" });
  await weight.click();
  await page.getByRole("option", { name: "Pocket · <150g" }).click();
  await expect(page).toHaveURL(/fmm=27&w=lt150/);
  await expect(heavyLens).toHaveCount(0);
  await expect(rangeLens).toHaveCount(1);

  await weight.click();
  await page.getByRole("option", { name: "Custom", exact: true }).click();
  const grams = page.getByRole("textbox", { name: "Custom weight limit in grams" });
  await grams.fill("95");
  await expect(rangeLens).toHaveCount(0);
  await grams.fill("100");
  await expect(page).toHaveURL(/fmm=27&w=100/);
  await expect(rangeLens).toHaveCount(1);
  await page.reload();
  await expect(rangeLens).toHaveCount(1);
  await openSecondaryFilters(page);
  await expect(grams).toHaveValue("100");
  await page.getByRole("button", { name: /fewer filters/i }).click();
  await page.getByRole("button", { name: "Clear weight limit" }).click();
  await expect(page).toHaveURL(/\?fmm=27$/);
  await expect(heavyLens).toHaveCount(1);
});

test.describe("Sort controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
  });

  test("toggling sort direction reverses card order", async ({ page }) => {
    const firstCardAsc = await page
      .locator(LENS_CARD_LINK)
      .first()
      .getAttribute("href");

    await page.getByRole("button", { name: /ascending|descending/i }).click();

    await page.waitForTimeout(200);

    const firstCardDesc = await page
      .locator(LENS_CARD_LINK)
      .first()
      .getAttribute("href");

    expect(firstCardDesc).not.toBe(firstCardAsc);
  });
});
