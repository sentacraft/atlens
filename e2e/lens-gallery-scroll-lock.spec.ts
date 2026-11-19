import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1200, height: 900 }, launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("keeps the page and section rail in place while the gallery locks scrolling", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile, "The regression requires desktop Chromium's classic scrollbar");
  await page.goto("/en/lenses/gfx/fujifilm-gf-35-70mmf45-56-wr-g");
  const trigger = page.getByRole("button", { name: "Enlarge product image" });
  const rail = page.locator('nav.flex-col[aria-label="Sections on this page"] a[href="#specs"]');
  await expect(rail).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => innerWidth - document.documentElement.clientWidth)).toBeGreaterThan(0);
  const position = async () => ({
    headingX: (await page.locator("h1").boundingBox())?.x,
    railX: (await rail.boundingBox())?.x,
    scrollY: await page.evaluate(() => window.scrollY),
  });
  const before = await position();

  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveClass(/gallery-settled/);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  expect(await position()).toEqual(before);

  await dialog.getByRole("button", { name: "Close image viewer" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await position()).toEqual(before);
});
