import { test, expect, type Page } from "@playwright/test";

const LENS_PATH = "/en/lenses/x/fujifilm-xf-56mmf12-r-wr-x";

// Hidden navigations are left out of role queries, so this finds whichever form is showing.
const sectionNav = (page: Page) => page.getByRole("navigation", { name: "Sections on this page" });

test.describe("Section navigation, lens detail", () => {
  test.describe("on a phone", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("a row of chips jumps to a section and puts it in the URL", async ({ page }) => {
      await page.goto(LENS_PATH);
      const nav = sectionNav(page);
      await expect(nav).toBeVisible();
      await nav.getByRole("link", { name: "More reviews" }).click();

      await expect(page).toHaveURL(/#more-reviews$/);
      await expect(page.getByRole("heading", { name: /more reviews/i })).toBeInViewport();
    });
  });

  test.describe("on a wide screen", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("a list in the left margin, level with the specification table", async ({ page }) => {
      await page.goto(LENS_PATH);
      const nav = sectionNav(page);
      await expect(nav).toBeVisible();

      const navBox = await nav.boundingBox();
      const specBox = await page.locator("#specs").boundingBox();
      const contentBox = await page.getByRole("heading", { level: 1 }).boundingBox();
      expect(navBox).not.toBeNull();
      expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(contentBox!.x);
      expect(Math.abs(navBox!.y - specBox!.y)).toBeLessThan(8);
    });
  });

  test.describe("with less room than the list needs", () => {
    test.use({ viewport: { width: 1100, height: 900 } });

    test("falls back to the chip row", async ({ page }) => {
      await page.goto(LENS_PATH);
      const nav = sectionNav(page);
      await expect(nav).toBeVisible();
      // The row spans the page content; the margin list is a narrow column beside it.
      const box = await nav.boundingBox();
      expect(box!.width).toBeGreaterThan(400);
    });
  });
});

test.describe("Section navigation, about page", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("lists the sections, and the current one follows the scroll", async ({ page }) => {
    await page.goto("/en/about");
    const nav = sectionNav(page);
    await expect(nav.getByRole("link", { name: "Privacy" })).toBeVisible();
    await nav.getByRole("link", { name: "Privacy" }).click();

    await expect(page).toHaveURL(/#privacy$/);
    await expect(nav.getByRole("link", { name: "Privacy" })).toHaveAttribute("aria-current", "true");
  });
});
