import { test, expect, type CDPSession, type Locator, type Page } from "@playwright/test";

const LENS_PATH = "/en/lenses/x/viltrox-af-28mm-f45-x";
const PRIMARY = /viltrox-af-28mm-f45-x\.webp/;
const ALTERNATE = /viltrox-af-28mm-f45-x\/001\.webp/;

async function expectSlide(viewport: Locator, source: RegExp) {
  await expect(viewport.getByRole("img", { name: /.+/ })).toHaveAttribute("src", source);
  const slide = viewport.locator('[data-slot="gallery-slide"][aria-hidden="false"]');
  await expect.poll(() => slide.evaluate(element => {
    const outer = element.closest('[data-slot="gallery-viewport"]')!;
    return Math.abs(element.getBoundingClientRect().left - outer.getBoundingClientRect().left);
  })).toBeLessThan(2);
}

async function mouseDrag(page: Page, viewport: Locator, reverse = false) {
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  const start = box.x + box.width * (reverse ? 0.2 : 0.8);
  const end = box.x + box.width * (reverse ? 0.8 : 0.2);
  const y = box.y + box.height / 2;
  await page.mouse.move(start, y);
  await page.mouse.down();
  await page.mouse.move(end, y, { steps: 10 });
  await page.mouse.up();
}

async function touchSwipe(session: CDPSession, viewport: Locator, reverse = false) {
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  const start = box.x + box.width * (reverse ? 0.2 : 0.8);
  const end = box.x + box.width * (reverse ? 0.8 : 0.2);
  const y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start, y, id: 1 }] });
  for (let step = 1; step <= 10; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start + (end - start) * step / 10, y, id: 1 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

for (const width of [375, 1280]) {
  test.describe(`lens gallery at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, isMobile: width < 640, hasTouch: width < 640 });

    test("switches images before opening the viewer", async ({ page }) => {
      await page.goto(LENS_PATH);
      const trigger = page.getByRole("button", { name: "Enlarge product image" });
      await expectSlide(trigger, PRIMARY);
      await expect(trigger.locator('[data-slot="gallery-slide"][aria-hidden="false"]')).toHaveCSS("padding", "32px");
      const expand = trigger.locator('span[aria-hidden="true"]');
      await expect(expand).toHaveCSS("cursor", "pointer");
      const expandBox = (await expand.boundingBox())!;
      expect(expandBox.width).toBe(44);
      expect(await expand.evaluate(element => parseFloat(getComputedStyle(element).borderTopLeftRadius)))
        .toBeGreaterThanOrEqual(expandBox.width / 2);

      if (width >= 640) {
        const previous = page.getByRole("button", { name: "Previous image", exact: true });
        const next = page.getByRole("button", { name: "Next image", exact: true });
        const nextBox = (await next.boundingBox())!;
        expect(nextBox.width).toBe(44);
        expect(nextBox.height).toBe(44);
        expect(await next.evaluate(element => parseFloat(getComputedStyle(element).borderTopLeftRadius)))
          .toBeGreaterThanOrEqual(nextBox.width / 2);
        await expect(page.getByRole("button", { name: "Main product image", exact: true }).locator("img"))
          .toHaveCSS("padding", "4px");
        await previous.hover();
        await expect(previous).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await next.click();
        await expect(next).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      } else {
        await mouseDrag(page, trigger);
      }

      await expectSlide(trigger, ALTERNATE);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("mouse dragging works in both views and keeps the selected image on reopening", async ({ page }) => {
      await page.goto(LENS_PATH);
      const trigger = page.getByRole("button", { name: "Enlarge product image" });
      await expectSlide(trigger, PRIMARY);
      await mouseDrag(page, trigger);
      await expectSlide(trigger, ALTERNATE);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await trigger.click();
      const dialog = page.getByRole("dialog");
      const viewer = dialog.locator('[data-slot="gallery-viewport"]');
      await expectSlide(viewer, ALTERNATE);
      await mouseDrag(page, viewer, true);
      await expectSlide(viewer, PRIMARY);
      await dialog.getByRole("button", { name: "Close image viewer" }).click();
      await expect(dialog).toHaveCount(0);
      await expectSlide(trigger, PRIMARY);
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expectSlide(viewer, PRIMARY);
    });

    test.describe("native touch input", () => {
      test.use({ hasTouch: true });
      test("swipes both views at phone and desktop widths", async ({ page, browserName }) => {
        test.skip(browserName !== "chromium", "Native touch injection uses Chromium's input protocol");
        await page.goto(LENS_PATH);
        const session = await page.context().newCDPSession(page);
        const trigger = page.getByRole("button", { name: "Enlarge product image" });
        await expectSlide(trigger, PRIMARY);
        await touchSwipe(session, trigger);
        await expectSlide(trigger, ALTERNATE);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await trigger.tap();
        const dialog = page.getByRole("dialog");
        const viewer = dialog.locator('[data-slot="gallery-viewport"]');
        await expectSlide(viewer, ALTERNATE);
        await touchSwipe(session, viewer, true);
        await expectSlide(viewer, PRIMARY);
        await dialog.getByRole("button", { name: "Close image viewer" }).tap();
        await expect(dialog).toHaveCount(0);
        await expectSlide(trigger, PRIMARY);
        await session.detach();
      });
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
          const slide = element.closest('[data-slot="gallery-slide"]')!;
          const viewport = element.closest('[data-slot="gallery-viewport"]')!;
          const outer = slide.getBoundingClientRect();
          const style = getComputedStyle(viewport);
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
