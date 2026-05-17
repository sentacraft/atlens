import type { Page } from "@playwright/test";

// Source of truth for breakpoints is the Tailwind theme, which exposes each
// breakpoint as a CSS custom property (e.g. --breakpoint-sm: 40rem) on :root.
// See src/hooks/useBreakpoint.ts for the in-component equivalent.
async function isBelowBreakpoint(page: Page, bp: "sm" | "md" | "lg" | "xl" | "2xl"): Promise<boolean> {
  return page.evaluate((name) => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--breakpoint-${name}`)
      .trim();
    if (!value) {
      return false;
    }
    return !window.matchMedia(`(min-width: ${value})`).matches;
  }, bp);
}

export async function selectBrandFilter(page: Page, brandName: string) {
  const isMobile = await isBelowBreakpoint(page, "sm");

  if (isMobile) {
    await page.getByRole("button", { name: /^Brand/ }).click();
    await page.getByRole("menuitemcheckbox", { name: brandName, exact: true }).click();
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: brandName, exact: true }).click();
  }
}
