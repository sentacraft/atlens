import { expect, test } from "@playwright/test";
import { LENS_CARD_LINK, irisToggle } from "./helpers";

test.describe("Ask Iris side panel", () => {
  test.beforeEach(({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");
  });

  test("opens from the nav beside the page, follows navigation, and closes", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    const toggle = irisToggle(page);
    await toggle.click();

    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\/en\/lenses\/x\/browse$/);
    const pagePadding = await page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--iris-panel-width"),
    );
    expect(pagePadding).toBe("400px");
    // The panel starts below the nav's bottom border instead of covering it.
    const navBottom = await page.getByRole("banner").evaluate((nav) => nav.getBoundingClientRect().bottom);
    const panelTop = await panel.evaluate((aside) => aside.getBoundingClientRect().top);
    expect(panelTop).toBeGreaterThanOrEqual(navBottom);

    // A client-side navigation keeps the panel and its conversation.
    await page.locator(LENS_CARD_LINK).first().click();
    await expect(page).not.toHaveURL(/\/browse$/);
    await expect(panel).toBeVisible();

    await panel.getByRole("button", { name: "Close" }).click();
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // The nav button is a toggle: it opens the panel and closes it again.
    await toggle.click();
    await expect(panel).toBeVisible();
    await toggle.click();
    await expect(panel).toBeHidden();
  });

  test("keeps the nav menu above the panel", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    await irisToggle(page).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel).toBeVisible();

    await page.getByRole("button", { name: "Menu" }).click();
    const item = page.getByRole("menuitem", { name: "About" });
    await expect(item).toBeVisible();
    const panelLeft = await panel.evaluate((aside) => aside.getBoundingClientRect().left);
    const hit = await item.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const x = box.right - 4;
      return { x, onItem: el.contains(document.elementFromPoint(x, box.top + box.height / 2)) };
    });
    expect(hit.x).toBeGreaterThan(panelLeft);
    expect(hit.onItem).toBe(true);
  });

  test("opens History as a popover under its button, leaving the panel its width", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    await irisToggle(page).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    // The panel slides in; its left edge is only its own once the slide has finished.
    await expect.poll(() => panel.evaluate((aside) => aside.getAnimations().length)).toBe(0);
    const panelLeft = await panel.evaluate((aside) => aside.getBoundingClientRect().left);

    const button = panel.getByRole("button", { name: "Conversations" });
    await button.click();
    const history = page.getByRole("dialog", { name: "Conversations" });
    await expect(history.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    const [buttonBox, historyBox] = await Promise.all([button.boundingBox(), history.boundingBox()]);
    expect(historyBox!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height);
    expect(historyBox!.x).toBeLessThanOrEqual(buttonBox!.x);
    expect(historyBox!.x + historyBox!.width).toBeGreaterThanOrEqual(buttonBox!.x + buttonBox!.width);
    expect(await panel.evaluate((aside) => aside.getBoundingClientRect().left)).toBe(panelLeft);

    await page.keyboard.press("Escape");
    await expect(history).toBeHidden();
  });

  test("narrows the page from the right, keeping its left edge under the nav's", async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 900 });
    await page.goto("/en/lenses/x/browse");
    // The page's centred shell, the same max-w-7xl container the nav sits in.
    const edges = () =>
      page.evaluate(() => {
        const shell = [...document.querySelectorAll("[class*='max-w-7xl']")].find((el) => !el.closest("header"))!;
        const box = shell.getBoundingClientRect();
        return [Math.round(box.left), Math.round(box.right)];
      });
    // The list renders in the browser; until it does the page is too short for a scrollbar, and
    // the scrollbar's arrival moves the centred shell.
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
    const [leftBefore] = await edges();

    await irisToggle(page).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel).toBeVisible();
    await expect
      .poll(async () => {
        const [left, right] = await edges();
        const panelLeft = await panel.evaluate((aside) => Math.round(aside.getBoundingClientRect().left));
        return { keepsLeft: left === leftBefore, endsAtPanel: Math.abs(right - panelLeft) <= 1 };
      })
      .toEqual({ keepsLeft: true, endsAtPanel: true });
  });

  test("collapses when a nav link is clicked, even one to the page it covers", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    await irisToggle(page).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    const panelLeft = () => panel.evaluate((aside) => aside.getBoundingClientRect().left);
    await panel.getByRole("button", { name: "Open full screen" }).click();
    await expect.poll(panelLeft).toBe(0);

    await page.getByRole("banner").getByRole("link", { name: "Browse" }).click();
    await expect.poll(panelLeft).toBeGreaterThan(0);
    await expect(panel).toBeVisible();
  });

  test("expands over the page in place, and Back or the button collapses it", async ({ page }) => {
    const browse = /\/en\/lenses\/x\/browse$/;
    await page.goto("/en/lenses/x/browse");
    await irisToggle(page).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    const panelLeft = () => panel.evaluate((aside) => aside.getBoundingClientRect().left);
    await panel.getByRole("textbox").fill("Which one for travel?");

    await panel.getByRole("button", { name: "Open full screen" }).click();
    await expect.poll(panelLeft).toBe(0);
    await expect(page).toHaveURL(browse);
    await expect(panel.getByRole("textbox")).toHaveValue("Which one for travel?");

    await page.goBack();
    await expect.poll(panelLeft).toBeGreaterThan(0);
    await expect(panel).toBeVisible();
    await expect(page).toHaveURL(browse);

    await panel.getByRole("button", { name: "Open full screen" }).click();
    await expect.poll(panelLeft).toBe(0);
    await panel.getByRole("button", { name: "Exit full screen" }).click();
    await expect.poll(panelLeft).toBeGreaterThan(0);
    await expect(page).toHaveURL(browse);
  });
});

test.describe("Ask Iris page entries", () => {
  const compareUrl = "/en/lenses/x/compare?ids=fujifilm-xf-23mmf14-r-lm-wr-x,fujifilm-xf-33mmf14-r-lm-wr-x";

  test("names the question a page entry asks, never the nav's general Ask Iris", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");

    await page.goto(compareUrl);
    const entry = page.getByRole("button", { name: /Explain the differences/ });
    await expect(entry).toBeVisible();
    // The nav's is the only button that says just "Ask Iris".
    await expect(page.getByRole("button", { name: /^Ask Iris/ })).toHaveCount(1);
    await entry.click();
    await expect(page.getByRole("complementary", { name: "Iris" })).toBeVisible();
  });

  test("leaves the lens page's actions to the nav, which opens Iris with this lens's questions first", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width >= 1024, "Narrow screens open the Ask Iris page");
    const lensUrl = "/en/lenses/x/fujifilm-xf-33mmf14-r-lm-wr-x";

    await page.goto(lensUrl);
    await expect(page.getByTestId("lens-detail-actions").getByRole("button")).toHaveCount(4);
    await irisToggle(page).click();

    await expect(page).toHaveURL(/\/en\/askiris\?from=/);
    const starters = page.getByRole("button", { name: /\?$/ });
    await expect(starters.first()).toHaveText(/^What is the .*XF 33mm F1\.4 R LM WR good for\?$/);
    await expect(page.getByRole("textbox")).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${lensUrl}$`));
  });

  test("opens Iris as a page of the tab bar on phones, with no close button, and Back returns", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width >= 640, "The tab bar is for screens below 640px");

    await page.goto("/en/lenses/x/browse");
    await irisToggle(page).click();
    await expect(page).toHaveURL(/\/en\/askiris/);
    const tabBar = page.getByRole("navigation", { name: "Main" });
    await expect(tabBar.getByRole("link", { name: /^Ask Iris/ })).toHaveAttribute("aria-current", "page");
    await expect(tabBar.getByRole("link", { name: "Browse" })).not.toHaveAttribute("aria-current");
    await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/lenses\/x\/browse$/);
  });
});

test.describe("Ask Iris panel empty state", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.skip(testInfo.project.name !== "chromium", "Sets its own viewport");
    await page.setViewportSize({ width: 1280, height: 800 });
    // The home page gives Iris no page context, so the panel opens on its plain empty state.
    await page.goto("/en");
  });

  test("shows the Iris hero at its size in the side panel", async ({ page }) => {
    await irisToggle(page).click();

    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel.getByRole("heading", { level: 1 })).toBeVisible();
    const hero = panel.getByTestId("iris");
    await expect(hero).toBeVisible();
    expect((await hero.boundingBox())!.width).toBe(56);
  });

  test("replays the hero's opening sweep each time the panel opens again", async ({ page }) => {
    const toggle = irisToggle(page);
    await toggle.click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    const hero = panel.getByTestId("iris");
    await expect(hero).toHaveAttribute("data-animating", "false", { timeout: 10_000 });

    await toggle.click();
    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(hero).toHaveAttribute("data-animating", "true");
  });
});
