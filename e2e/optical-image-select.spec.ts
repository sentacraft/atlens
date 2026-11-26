import { expect, test } from "./support/test";

for (const width of [375, 949]) {
  test(`MTF option text fits the menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/en/lenses/gfx/compare?ids=fujifilm-gf-35-70mmf45-56-wr-g,fujifilm-gf-45-100mmf4-r-lm-ois-wr-g");
    await page.getByRole("button", { name: "View MTF charts", exact: true }).first().click();
    await page.getByRole("combobox", { name: /Select image for GF 35-70mm/ }).click();
    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveCount(6);
    await expect(options.first()).toHaveText("35mm · 10 lines/mm");
    await expect.poll(() => options.evaluateAll((items) => items.every((item) => {
      const text = item.querySelector('[data-slot="chart-option-label"]');
      if (!text) {return false;}
      const range = document.createRange();
      range.selectNodeContents(text);
      const bounds = item.getBoundingClientRect();
      const padding = Number.parseFloat(getComputedStyle(item).paddingRight);
      return [...range.getClientRects()].every((rect) => rect.right <= bounds.right - padding + 1);
    }))).toBe(true);
  });
}

for (const width of [375, 1280]) {
  test(`single-lens MTF gallery keeps its caption and filter in sync at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en/lenses/gfx/fujifilm-gf-35-70mmf45-56-wr-g");
    const trigger = page.getByRole("button", { name: "View remaining MTF charts" });
    await trigger.click();
    const gallery = page.getByRole("dialog", { name: /MTF charts · GF 35-70mm/ });
    const caption = gallery.locator('[data-slot="gallery-caption"]');
    await expect(gallery).toHaveClass(/gallery-settled/);
    await expect(caption).toContainText("35mm · 40 lines/mm");
    await expect(gallery.getByRole("img", { name: /35mm · 40 lines\/mm/ })).toHaveCSS("filter", "saturate(0.6)");
    await gallery.getByRole("button", { name: "Next image", exact: true }).click();
    await expect(caption).toContainText("70mm · 10 lines/mm");
    await gallery.getByRole("button", { name: "Close image viewer" }).click();
    await expect(trigger).toBeFocused();
  });
}
