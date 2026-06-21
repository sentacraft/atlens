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

// Focal range, features, optical and focus-motor filters live in a "More
// Filters" disclosure that is collapsed by default on every viewport. Open it
// before interacting with any of those (secondary) chips. No-op if already open
// (the toggle then reads "Fewer Filters", which this name match skips).
export async function openSecondaryFilters(page: Page) {
  const toggle = page.getByRole("button", { name: /more filters/i });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
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
