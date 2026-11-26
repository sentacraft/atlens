import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1200, height: 900 }, launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("keeps the page and section rail in place while the gallery locks scrolling", { tag: "@local-only" }, async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile, "The regression requires desktop Chromium's classic scrollbar");
  await page.goto("/en/lenses/gfx/fujifilm-gf-35-70mmf45-56-wr-g#specs");
  const trigger = page.getByRole("button", { name: "Open image: 35mm · 10 lines/mm" });
  const rail = page.locator('nav.flex-col[aria-label="Sections on this page"] a[href="#specs"]');
  await expect(rail).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => innerWidth - document.documentElement.clientWidth)).toBeGreaterThan(0);
  const position = async () => ({
    headingX: (await page.locator("h1").boundingBox())?.x,
    rail: await rail.boundingBox(),
    scrollY: await page.evaluate(() => window.scrollY),
  });
  const before = await position();
  expect(before.scrollY).toBeGreaterThan(0);

  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveClass(/gallery-settled/);
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  expect(await position()).toEqual(before);

  await dialog.getByRole("button", { name: "Close image viewer" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await position()).toEqual(before);
});
