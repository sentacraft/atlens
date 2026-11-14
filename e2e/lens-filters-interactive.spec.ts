import { test, expect } from "@playwright/test";
import { LENS_CARD_LINK, openSecondaryFilters, selectBrandFilter } from "./helpers";

test.describe("Focal range filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
  });

  test("focal category chip narrows results", async ({ page }) => {
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    await page.getByRole("button", { name: /^Standard/ }).click();

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

test("custom equivalent focal lengths match nearby primes and survive history and reload", async ({ page }) => {
  await page.goto("/en/lenses/x/browse?src=filter-test");
  await page.getByRole("button", { name: "Custom…", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Custom focal length" });
  await input.fill("40");
  await input.press("Enter");
  await expect(page).toHaveURL(/fmm=40&fr=equivalent/);
  const prime = page.locator('a[href$="/fujifilm-xf-27mmf28-r-wr-x"]');
  await expect(prime).toHaveCount(1);
  await expect(page.locator('a[href$="/fujifilm-xf-23mmf2-r-wr-x"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Focal length convention" }).click();
  await page.getByRole("menuitemradio", { name: "Actual", exact: true }).click();
  await expect(page).toHaveURL(/fr=actual/);
  await expect(prime).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Focal length convention" })).toHaveText("Equiv. (FF)");
  await expect(input).toHaveValue("40");
  await page.reload();
  await expect(input).toHaveValue("40");
  await expect(prime).toHaveCount(1);

  await page.getByRole("button", { name: "Standard", exact: true }).click();
  await expect(input).toHaveCount(0);
  await expect(page).toHaveURL(/fc=standard/);
  expect(new URL(page.url()).searchParams.has("fmm")).toBe(false);
  expect(new URL(page.url()).searchParams.get("src")).toBe("filter-test");
});

test("aperture and custom weight limits persist and reset together", async ({ page }) => {
  await page.goto("/en/lenses/x/browse");
  await openSecondaryFilters(page);
  await page.getByRole("button", { name: "Max Aperture", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "f/2.8 or faster", exact: true }).click();
  await page.getByRole("button", { name: "Weight limit", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Custom…", exact: true }).click();
  const weight = page.getByRole("textbox", { name: "Maximum lens weight in grams" });
  await weight.fill("310");
  await weight.press("Enter");
  await expect(page).toHaveURL(/ap=2.8&w=310/);
  await expect(page.locator('a[href$="/fujifilm-xf-18-55mmf28-4-r-lm-ois-x"]')).toHaveCount(1);
  await expect(page.locator('a[href$="/fujifilm-xf-16-55mmf28-r-lm-wr-ii-x"]')).toHaveCount(0);
  await page.reload();
  await openSecondaryFilters(page);
  await expect(weight).toHaveValue("310");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(weight).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Weight limit", exact: true })).toHaveText("No limit");
  expect(new URL(page.url()).search).toBe("");
});

test("filter menus share pill geometry and leave room after the chevron", async ({ page }) => {
  await page.goto("/en/lenses/x/browse");
  await page.getByRole("button", { name: "Custom…", exact: true }).click();
  await openSecondaryFilters(page);
  for (const name of ["Focal length convention", "Max Aperture", "Weight limit"]) {
    const trigger = page.getByRole("button", { name, exact: true });
    const dimensions = await trigger.evaluate((element) => {
      const styles = getComputedStyle(element);
      const arrow = element.querySelector("svg")!;
      const rect = element.getBoundingClientRect();
      const arrowRect = arrow.getBoundingClientRect();
      return { height: rect.height, radius: parseFloat(styles.borderRadius), rightInset: rect.right - arrowRect.right };
    });
    expect(dimensions.height).toBe(36);
    expect(dimensions.radius).toBeGreaterThanOrEqual(18);
    expect(dimensions.rightInset).toBeGreaterThanOrEqual(14);
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
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
