import type { Page } from "@playwright/test";

const MOBILE_VIEWPORT_BREAKPOINT = 640;

export async function selectBrandFilter(page: Page, brandName: string) {
  const viewport = page.viewportSize();
  const isMobile = viewport != null && viewport.width < MOBILE_VIEWPORT_BREAKPOINT;

  if (isMobile) {
    await page.getByRole("button", { name: /^Brand/ }).click();
    await page.getByRole("menuitemcheckbox", { name: brandName, exact: true }).click();
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: brandName, exact: true }).click();
  }
}
