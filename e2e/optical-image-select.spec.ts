import { expect, test } from "@playwright/test";

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
