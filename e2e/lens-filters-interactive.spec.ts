import { test, expect } from "./support/test";
import { LENS_CARD_LINK, openSecondaryFilters, selectBrandFilter } from "./helpers";

test.describe("Focal range filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/lenses");
    await page.getByText(/\d+ lenses/).waitFor();
  });

  test("focal category chip narrows results", async ({ page }) => {
    const countText = await page.getByText(/\d+ lenses/).textContent();
    const totalCount = parseInt(countText!.match(/\d+/)![0], 10);

    const standard = page.getByRole("button", { name: /^Standard/ });
    await standard.click();
    await expect(standard).toHaveAttribute("aria-pressed", "true");

    const filteredText = await page.getByText(/\d+ lenses/).textContent();
    const filteredCount = parseInt(filteredText!.match(/\d+/)![0], 10);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);
  });

  test("combining brand and focal filters compounds correctly", async ({ page }) => {
    await selectBrandFilter(page, "Sigma");
    const sigmaText = await page.getByText(/\d+ lenses/).textContent();
    const sigmaCount = parseInt(sigmaText!.match(/\d+/)![0], 10);

    const standard = page.getByRole("button", { name: /^Standard/ });
    await standard.click();
    await expect(standard).toHaveAttribute("aria-pressed", "true");
    const combinedText = await page.getByText(/\d+ lenses/).textContent();
    const combinedCount = parseInt(combinedText!.match(/\d+/)![0], 10);

    expect(combinedCount).toBeLessThanOrEqual(sigmaCount);
  });
});

test("custom equivalent focal lengths match nearby primes and survive history and reload", async ({ page }) => {
  await page.goto("/en/lenses/x/browse?filter-test=preserved");
  await page.getByRole("button", { name: "Cover a focal length", exact: true }).click();
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
  await expect(page.getByRole("button", { name: "Focal length convention" })).toHaveText("Equiv.");
  await expect(input).toHaveValue("40");
  await page.reload();
  await expect(input).toHaveValue("40");
  await expect(prime).toHaveCount(1);

  await page.getByRole("button", { name: "Standard", exact: true }).click();
  await expect(input).toHaveCount(0);
  await expect(page).toHaveURL(/fc=standard/);
  expect(new URL(page.url()).searchParams.has("fmm")).toBe(false);
  expect(new URL(page.url()).searchParams.get("filter-test")).toBe("preserved");
});

test("coverage is entered inline with a convention menu and no clear action", async ({ page }) => {
  await page.goto("/en/lenses/x/browse?b=fujifilm");
  await page.getByRole("button", { name: "Cover a focal length", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Custom focal length" });
  const focal = page.getByRole("group", { name: "Focal length", exact: true });
  await expect(input).toBeFocused();
  await expect(focal.getByRole("button", { name: "Standard", exact: true })).toBeVisible();
  await input.fill("40");
  await input.press("Enter");
  await expect(input).not.toBeFocused();
  await expect(focal.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "false");
  const chip = page.getByRole("group", { name: "Cover a focal length", exact: true });
  await chip.getByRole("button", { name: "Focal length convention" }).click();
  await expect(page.getByRole("menuitemradio")).toHaveCount(2);
  await expect(page.getByRole("menuitem", { name: /clear|remove/i })).toHaveCount(0);
  await expect(page.getByText("Primes and zooms within a 5% logarithmic window of this focal length match.", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(chip.getByRole("button", { name: "Focal length convention" })).toBeFocused();
  await expect(chip.getByRole("button")).toHaveCount(1);
  const geometry = await chip.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const input = element.querySelector("input")!.getBoundingClientRect();
    const trigger = element.querySelector("button")!.getBoundingClientRect();
    const arrow = element.querySelector("svg")!.getBoundingClientRect();
    return { height: bounds.height, radius: parseFloat(getComputedStyle(element).borderRadius), inputRight: input.right, triggerLeft: trigger.left, arrowInset: bounds.right - arrow.right, triggerBottom: trigger.bottom, bottom: bounds.bottom };
  });
  expect(geometry.height).toBe(36);
  expect(geometry.radius).toBeGreaterThanOrEqual(18);
  expect(geometry.triggerLeft).toBeGreaterThanOrEqual(geometry.inputRight);
  expect(geometry.arrowInset).toBeGreaterThanOrEqual(14);
  expect(geometry.triggerBottom).toBeLessThanOrEqual(geometry.bottom);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await focal.getByRole("button", { name: "All", exact: true }).click();
  await expect(input).toHaveCount(0);
  await expect(focal.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\?b=fujifilm$/);
});

test("coverage chip follows focal presets and stays one unbroken control", async ({ page }) => {
  for (const query of ["b=fujifilm", "b=fujifilm&fmm=40&fr=equivalent"]) {
    await page.goto(`/en/lenses/x/browse?${query}`);
    const focal = page.getByRole("group", { name: "Focal length", exact: true });
    const control = query.includes("fmm=")
      ? page.getByRole("group", { name: "Cover a focal length", exact: true })
      : page.getByRole("button", { name: "Cover a focal length", exact: true });
    await expect(control).toBeVisible();
    await expect(focal.getByRole("button", { name: "Standard", exact: true })).toBeVisible();
    const bounds = await control.boundingBox();
    const groupBounds = await focal.boundingBox();
    expect(bounds).not.toBeNull();
    expect(groupBounds).not.toBeNull();
    expect(bounds!.height).toBe(36);
    expect(bounds!.x).toBeGreaterThanOrEqual(groupBounds!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(groupBounds!.x + groupBounds!.width + 1);
    if ((page.viewportSize()?.width ?? 1280) >= 1024) {
      const last = await focal.getByRole("button", { name: "Super Tele", exact: true }).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(last!.x + last!.width);
      expect(Math.abs(bounds!.y - last!.y)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
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
  await page.getByRole("button", { name: "Cover a focal length", exact: true }).click();
  await openSecondaryFilters(page);
  for (const name of ["Max Aperture", "Weight limit"]) {
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

test("phone limit filters share a row without a persistent aperture note", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1280) >= 640, "Phone layout only");
  await page.goto("/en/lenses/x/browse?b=fujifilm");
  await openSecondaryFilters(page);
  const aperture = await page.getByRole("button", { name: "Max Aperture", exact: true }).boundingBox();
  const weight = await page.getByRole("button", { name: "Weight limit", exact: true }).boundingBox();
  expect(aperture).not.toBeNull();
  expect(weight).not.toBeNull();
  expect(Math.abs(aperture!.y - weight!.y)).toBeLessThanOrEqual(1);
  expect(weight!.x).toBeGreaterThan(aperture!.x);
  await expect(page.getByText("Variable-aperture zooms use the wide-end value.", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("phone filter actions use two left-aligned rows", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1280) >= 640, "Phone layout only");
  await page.goto("/en/lenses/x/browse?b=fujifilm&ap=2.8");
  const toggle = page.getByRole("button", { name: /more filters/i });
  const assist = page.getByRole("button", { name: "Pick for my filters", exact: true });
  await expect(assist).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
  const toggleBox = await toggle.boundingBox();
  const assistBox = await assist.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(assistBox).not.toBeNull();
  expect(Math.abs(assistBox!.x - toggleBox!.x)).toBeLessThanOrEqual(1);
  expect(assistBox!.y).toBeGreaterThanOrEqual(toggleBox!.y + toggleBox!.height);
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

    await expect(page.locator(LENS_CARD_LINK).first()).not.toHaveAttribute("href", firstCardAsc!);
  });
});
