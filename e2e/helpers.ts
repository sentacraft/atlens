import { expect, type Locator, type Page } from "@playwright/test";

/** The Ask Iris toggle: in the header from the sm breakpoint up, in the phone tab bar below it. */
export function irisToggle(page: Page): Locator {
  return page
    .getByRole("banner")
    .or(page.getByRole("navigation", { name: "Main" }))
    .getByRole("button", { name: /^Ask Iris/ });
}

// Lens ids end in the mount suffix, so nav links under /lenses/x/ (browse, charts, compare, ...) never match.
export const LENS_CARD_LINK = 'a[href^="/en/lenses/x/"][href$="-x"]';

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

// Secondary filters sit behind the collapsed "More Filters" disclosure. No-op if already open.
export async function openSecondaryFilters(page: Page) {
  const toggle = page.getByRole("button", { name: /more filters|fewer filters/i });
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute("aria-expanded") !== "true") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

export async function selectBrandFilter(page: Page, brandName: string) {
  const isMobile = await isBelowBreakpoint(page, "sm");

  if (isMobile) {
    await page.getByRole("button", { name: /^Brand/ }).click();
    const option = page.getByRole("menuitemcheckbox", { name: brandName, exact: true });
    await option.click();
    await expect(option).toBeChecked();
    await page.keyboard.press("Escape");
  } else {
    const chip = page.getByRole("button", { name: brandName, exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  }
}
