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
      await nav.getByRole("link", { name: "Reviews", exact: true }).click();

      await expect(page).toHaveURL(/#reviews$/);
      await expect(page.getByRole("heading", { level: 2, name: "Reviews", exact: true })).toBeInViewport();
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

for (const width of [375, 1100]) {
  test.describe(`Section navigation spacing at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("detail chips have 16px of space on either side and stay sticky", async ({ page }) => {
      await page.goto(LENS_PATH);
      const nav = sectionNav(page);
      await expect(nav).toBeVisible();

      await expect.poll(async () => nav.evaluate((element) => {
        let previous = element.previousElementSibling;
        while (previous) {
          const style = getComputedStyle(previous);
          if (style.display !== "none" && style.position !== "absolute") {
            break;
          }
          previous = previous.previousElementSibling;
        }
        const chip = element.querySelector("a")!.getBoundingClientRect();
        const before = previous!.getBoundingClientRect();
        const after = document.getElementById("specs")!.getBoundingClientRect();
        return {
          before: Math.round(chip.top - before.bottom),
          after: Math.round(after.top - chip.bottom),
        };
      })).toEqual({ before: 16, after: 16 });

      await nav.evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top + 200));
      await expect.poll(async () => nav.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.position === "sticky"
          && Math.abs(element.getBoundingClientRect().top - Number.parseFloat(style.top)) < 1;
      })).toBe(true);
    });
  });
}

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
