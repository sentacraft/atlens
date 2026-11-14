import { test, expect } from "@playwright/test";

const LENS_PATH = "/en/lenses/x/viltrox-af-28mm-f45-x";

for (const width of [375, 1280]) {
  test.describe(`lens gallery at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, isMobile: width < 640, hasTouch: width < 640 });

    test("switches images before opening the viewer", async ({ page }) => {
      await page.goto(LENS_PATH);
      const trigger = page.getByRole("button", { name: "Enlarge product image" });
      const image = trigger.getByRole("img");
      await expect(image).toHaveAttribute("src", /viltrox-af-28mm-f45-x\.webp/);

      if (width >= 640) {
        await page.getByRole("button", { name: "Next image", exact: true }).click();
      } else {
        const start = { identifier: 1, clientX: 240, clientY: 200 };
        const end = { identifier: 1, clientX: 120, clientY: 200 };
        await trigger.dispatchEvent("touchstart", { touches: [start], targetTouches: [start], changedTouches: [start] });
        await trigger.dispatchEvent("touchmove", { touches: [end], targetTouches: [end], changedTouches: [end] });
        await trigger.dispatchEvent("touchend", { touches: [], targetTouches: [], changedTouches: [end] });
      }

      await expect(image).toHaveAttribute("src", /viltrox-af-28mm-f45-x\/001\.webp/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    for (const id of [
      "sgimage-mf-18mm-f63-aps-c-ultra-slim-pancake-lens-x",
      "fujifilm-xf-33mmf14-r-lm-wr-x",
      "fujifilm-xf-150-600mmf56-8-r-lm-ois-wr-x",
    ]) {
      test(`${id}: image fits the white viewer with breathing room`, async ({ page }) => {
        await page.goto(`/en/lenses/x/${id}`);
        await page.getByRole("button", { name: "Enlarge product image" }).click();
        const dialog = page.getByRole("dialog");
        const image = dialog.getByRole("img", { name: /.+/ });
        await expect(image).toBeVisible();
        await expect(image).toHaveCSS("object-fit", "contain");
        const layout = await image.evaluate(element => {
          const box = element.getBoundingClientRect();
          const stage = element.parentElement!.parentElement!.parentElement!;
          const outer = stage.getBoundingClientRect();
          const style = getComputedStyle(stage);
          return {
            left: box.left - outer.left,
            right: outer.right - box.right,
            top: box.top - outer.top,
            bottom: outer.bottom - box.bottom,
            background: style.backgroundColor,
            border: style.borderTopWidth,
            touchAction: style.touchAction,
          };
        });
        for (const gap of [layout.left, layout.right, layout.top, layout.bottom]) {
          expect(gap).toBeGreaterThanOrEqual(32);
        }
        expect(layout.background).toBe("rgba(0, 0, 0, 0)");
        expect(layout.border).toBe("0px");
        expect(layout.touchAction).toContain("pinch-zoom");
        await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
      });
    }
  });
}
