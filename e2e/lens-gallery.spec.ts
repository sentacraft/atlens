import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test, expect, type CDPSession, type Locator, type Page } from "@playwright/test";
import type { Lens } from "../src/lib/types";

const publicAssets = JSON.parse(readFileSync(new URL("../src/data/public-assets.json", import.meta.url), "utf8")) as { assets: Record<string, { key: string }> };
const catalog = JSON.parse(readFileSync(new URL("../src/data/lenses.json", import.meta.url), "utf8")) as Lens[];
const LENS_ID = "viltrox-af-28mm-f45-x";
const LENS_PATH = `/en/lenses/x/${LENS_ID}`;
const PRIMARY = /viltrox-af-28mm-f45-x\.webp/;
const productImages = catalog.find(lens => lens.id === LENS_ID)!.images!.filter(image => image.role === "product");
const GALLERY_IMAGES = [PRIMARY, ...productImages.map(image => {
  const assetKey = publicAssets.assets[`lens-images/${LENS_ID}/${image.id}`].key;
  return new RegExp(`^https://[^/]+/${assetKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
})];
const SECOND_IMAGE = GALLERY_IMAGES[1];
const IMAGE_FIXTURE = fileURLToPath(new URL("../public/lenses/viltrox-af-28mm-f45-x.webp", import.meta.url));

test.beforeEach(async ({ page }) => {
  expect(GALLERY_IMAGES.length).toBeGreaterThan(1);
  for (const source of GALLERY_IMAGES.slice(1)) {
    await page.route(source, route => route.fulfill({ path: IMAGE_FIXTURE, contentType: "image/webp" }));
  }
});

async function expectSlide(viewport: Locator, source: RegExp) {
  if (await viewport.getAttribute("role") === "dialog") {await expect(viewport).toHaveClass(/gallery-settled/);}
  const image = viewport.getByRole("img", { name: /.+/ });
  await expect(image).toHaveAttribute("src", source);
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  if (await viewport.getAttribute("data-slot") === "gallery-viewport") {
    const slide = viewport.locator('[data-slot="gallery-slide"][aria-hidden="false"]');
    await expect.poll(() => slide.evaluate(element => Math.abs(element.getBoundingClientRect().left - element.closest('[data-slot="gallery-viewport"]')!.getBoundingClientRect().left))).toBeLessThan(2);
  }
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

async function touchSwipe(session: CDPSession, viewport: Locator, reverse = false, vertical = false) {
  const box = (await viewport.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const start = vertical ? y - 100 : box.x + box.width * (reverse ? 0.2 : 0.8);
  const end = vertical ? y + 190 : box.x + box.width * (reverse ? 0.8 : 0.2);
  const point = (value: number) => ({ x: vertical ? x : value, y: vertical ? value : y, id: 1 });
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(start)] });
  for (let step = 1; step <= 12; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(start + (end - start) * step / 12)] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

for (const width of [375, 1280]) {
  test.describe(`lens gallery at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, isMobile: width < 640, hasTouch: width < 640 });

    test("switches images before opening and shows a compact phone counter", async ({ page }) => {
      await page.goto(LENS_PATH);
      const trigger = page.getByRole("button", { name: "Enlarge product image" });
      await expectSlide(trigger, PRIMARY);
      await expect(trigger.locator('[data-slot="gallery-slide"][aria-hidden="false"]')).toHaveCSS("padding", "32px");
      if (width >= 640) {
        const next = page.getByRole("button", { name: "Next image", exact: true });
        const box = (await next.boundingBox())!;
        expect(box.width).toBe(44);
        expect(box.height).toBe(44);
        await expect(page.getByRole("button", { name: "Main product image", exact: true }).locator("img")).toHaveCSS("padding", "4px");
        await next.click();
      } else {
        await expect(trigger.locator('[data-slot="gallery-count"]')).toHaveText(`1 / ${GALLERY_IMAGES.length}`);
        await expect(page.getByRole("button", { name: "Product image 2", exact: true })).toHaveCount(0);
        await mouseDrag(page, trigger);
        await expect(trigger.locator('[data-slot="gallery-count"]')).toHaveText(`2 / ${GALLERY_IMAGES.length}`);
      }
      await expectSlide(trigger, SECOND_IMAGE);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("keeps the selected image, scroll position, and focus after closing", async ({ page }) => {
      await page.goto(LENS_PATH);
      const trigger = page.getByRole("button", { name: "Enlarge product image" });
      await mouseDrag(page, trigger);
      await expectSlide(trigger, SECOND_IMAGE);
      const scrollY = await page.evaluate(() => window.scrollY);
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expectSlide(dialog, SECOND_IMAGE);
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
      await dialog.getByRole("button", { name: "Previous image" }).click();
      await expectSlide(dialog, PRIMARY);
      await dialog.getByRole("button", { name: "Close image viewer" }).click();
      await expect(dialog).toHaveCount(0);
      await expectSlide(trigger, PRIMARY);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
      await page.keyboard.press("Enter");
      await expectSlide(dialog, PRIMARY);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    });

    test("only the desktop backdrop closes the gallery on a mouse click", async ({ page }) => {
      await page.goto(LENS_PATH);
      const trigger = page.getByRole("button", { name: "Enlarge product image" });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expectSlide(dialog, PRIMARY);

      await page.mouse.click(width / 2, 140);
      await expect(dialog).toHaveClass(/gallery-settled/);
      await page.mouse.click(8, 450);
      if (width >= 640) {
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
      } else {
        await expect(dialog).toHaveClass(/gallery-settled/);
      }
    });

    test("mouse clicks toggle image zoom without hiding controls", async ({ page }) => {
      await page.goto(LENS_PATH);
      await page.getByRole("button", { name: "Enlarge product image" }).click();
      const dialog = page.getByRole("dialog");
      await expectSlide(dialog, PRIMARY);
      await expect(dialog.getByRole("button", { name: "Zoom image" })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Close image viewer" })).toBeVisible();
      const image = dialog.getByRole("img", { name: /.+/ });
      const previous = dialog.locator(".gallery-side-arrow-prev");
      const next = dialog.locator(".gallery-side-arrow-next");
      if (width >= 640) {
        await expect(previous).toBeVisible();
        await expect(previous).toBeDisabled();
        await expect(next).toBeVisible();
        const imageBox = (await image.boundingBox())!;
        const previousBox = (await previous.boundingBox())!;
        const nextBox = (await next.boundingBox())!;
        expect(previousBox.width).toBe(44);
        expect(previousBox.height).toBe(44);
        expect(previousBox.x + previousBox.width).toBeLessThanOrEqual(imageBox.x);
        expect(nextBox.x).toBeGreaterThanOrEqual(imageBox.x + imageBox.width);
        await next.click();
        await expectSlide(dialog, SECOND_IMAGE);
        await expect.poll(async () => (await previous.boundingBox())!.x).toBe(previousBox.x);
        await expect.poll(async () => (await next.boundingBox())!.x).toBe(nextBox.x);
        await expect(previous).toBeEnabled();
        for (const source of GALLERY_IMAGES.slice(2)) {
          await expect(next).toBeEnabled();
          await next.click();
          await expectSlide(dialog, source);
        }
        await expect(next).toBeDisabled();
        for (const source of GALLERY_IMAGES.slice(0, -1).reverse()) {
          await previous.click();
          await expectSlide(dialog, source);
        }
        await expect(previous).toBeDisabled();
        await expect(next).toBeEnabled();
      } else {
        await expect(previous).toBeHidden();
        await expect(next).toBeHidden();
      }
      await image.click();
      await expect(dialog).toHaveClass(/pswp--zoomed-in/);
      await expect(dialog.locator('[data-slot="gallery-controls"]')).not.toHaveAttribute("inert", "");
      await expect(dialog.getByText("← → to browse · Click to zoom in/out · Esc to close", { exact: true })).toBeVisible();
      await image.click();
      await expect(dialog).not.toHaveClass(/pswp--zoomed-in/);
      await expect(dialog.locator('[data-slot="gallery-controls"]')).not.toHaveAttribute("inert", "");
    });

    test.describe("native touch input", () => {
      test.use({ hasTouch: true });
      test("swipes both views and drags down to close", async ({ page, browserName }) => {
        test.skip(browserName !== "chromium", "Native touch injection uses Chromium's input protocol");
        await page.goto(LENS_PATH);
        const session = await page.context().newCDPSession(page);
        const trigger = page.getByRole("button", { name: "Enlarge product image" });
        await expectSlide(trigger, PRIMARY);
        await touchSwipe(session, trigger);
        await expectSlide(trigger, SECOND_IMAGE);
        await trigger.tap();
        const dialog = page.getByRole("dialog");
        await expectSlide(dialog, SECOND_IMAGE);
        const image = dialog.getByRole("img", { name: /.+/ });
        await image.tap();
        await expect(dialog.locator('[data-slot="gallery-controls"]')).toHaveAttribute("inert", "");
        await expect(dialog).toBeVisible();
        await image.tap();
        await expect(dialog.locator('[data-slot="gallery-controls"]')).not.toHaveAttribute("inert", "");
        await expect(dialog.getByText("Swipe to browse · Drag down to close · Double-tap to zoom", { exact: true })).toBeVisible();
        await touchSwipe(session, image, true);
        await expectSlide(dialog, PRIMARY);
        await touchSwipe(session, image, false, true);
        await expect(dialog).toHaveCount(0);
        await expectSlide(trigger, PRIMARY);
        await session.detach();
      });
    });

    for (const id of ["sgimage-mf-18mm-f63-aps-c-ultra-slim-pancake-lens-x", "fujifilm-xf-33mmf14-r-lm-wr-x", "fujifilm-xf-150-600mmf56-8-r-lm-ois-wr-x"]) {
      test(`${id}: image fits the viewer and controls`, async ({ page }) => {
        await page.goto(`/en/lenses/x/${id}`);
        await page.getByRole("button", { name: "Enlarge product image" }).click();
        const dialog = page.getByRole("dialog");
        const image = dialog.getByRole("img", { name: /.+/ });
        await expect(image).toBeVisible();
        await expect(image).toHaveCSS("object-fit", "contain");
        await expect.poll(async () => {
          const box = (await image.boundingBox())!;
          const header = (await dialog.locator(".gallery-header").boundingBox())!;
          const footer = (await dialog.locator(".gallery-footer").boundingBox())!;
          return box.y >= header.y + header.height && box.y + box.height <= footer.y + 1;
        }).toBe(true);
        if (width < 640) {
          await expect(dialog).toHaveCSS("--pswp-bg", "white");
        }
      });
    }
  });
}

test.describe("gallery with a classic scrollbar", () => {
  test.use({ viewport: { width: 1200, height: 900 }, launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

  test("keeps the page and section rail in place while the gallery locks scrolling", async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== "chromium" || isMobile, "The regression requires desktop Chromium's classic scrollbar");
    await page.goto("/en/lenses/gfx/fujifilm-gf-35-70mmf45-56-wr-g");
    const trigger = page.getByRole("button", { name: "Enlarge product image" });
    const rail = page.locator('nav.flex-col[aria-label="Sections on this page"] a[href="#specs"]');
    await expect(rail).toBeVisible();
    await trigger.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => innerWidth - document.documentElement.clientWidth)).toBeGreaterThan(0);
    const position = async () => ({
      headingX: (await page.locator("h1").boundingBox())?.x,
      railX: (await rail.boundingBox())?.x,
      scrollY: await page.evaluate(() => window.scrollY),
    });
    const before = await position();

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveClass(/gallery-settled/);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    expect(await position()).toEqual(before);

    await dialog.getByRole("button", { name: "Close image viewer" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await position()).toEqual(before);
  });
});

test("eight-image phone gallery stays in bounds and scrolls to the selected thumbnail", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/en/lenses/x/sgimage-af-35mmf14-x");
  const trigger = page.getByRole("button", { name: "Enlarge product image" });
  await expect(trigger.locator('[data-slot="gallery-count"]')).toHaveText("1 / 8");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const last = dialog.getByRole("button", { name: "Product image 8", exact: true });
  await expect(dialog).toHaveClass(/gallery-settled/);
  for (let i = 2; i <= 8; i++) {
    await dialog.getByRole("button", { name: "Next image", exact: true }).click();
    await expect(dialog.getByText(`${i} / 8`, { exact: true })).toBeVisible();
  }
  await expect(last).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => last.evaluate(element => {
    const rail = element.parentElement!.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return box.left >= rail.left && box.right <= rail.right;
  })).toBe(true);
  await expect(dialog.getByText("8 / 8", { exact: true })).toBeVisible();
});

test("reduced motion uses a short fade instead of thumbnail zoom", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LENS_PATH);
  await page.getByRole("button", { name: "Enlarge product image" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/gallery-settled/);
  await expect(dialog).toHaveCSS("--gallery-duration", "80ms");
  await dialog.getByRole("button", { name: "Close image viewer" }).click();
  await expect(dialog).toHaveCount(0);
});
