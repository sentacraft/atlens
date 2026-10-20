import { expect, test } from "@playwright/test";

test.describe("Ask Iris side panel", () => {
  test.beforeEach(({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");
  });

  test("opens from the nav beside the page, follows navigation, and closes", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    const toggle = page.getByRole("banner").getByRole("button", { name: /^Ask Iris/ });
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
    await page.locator('a[href^="/en/lenses/x/"]:not([href$="/browse"]):not([href*="/collections"])').first().click();
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
    await page.getByRole("banner").getByRole("button", { name: /^Ask Iris/ }).click();
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
});

test.describe("Ask Iris context entries", () => {
  const compareUrl = "/en/lenses/x/compare?ids=fujifilm-xf-23mmf14-r-lm-wr-x,fujifilm-xf-33mmf14-r-lm-wr-x";

  test("opens the side panel about the page, with questions for it, without sending anything", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");
    const chatRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/chat")) {
        chatRequests.push(request.url());
      }
    });

    await page.goto(compareUrl);
    await page.getByRole("button", { name: /Ask Iris how they differ/ }).click();

    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel.getByText("Comparing 2")).toBeVisible();
    await expect(panel.getByRole("button", { name: /What are the main differences/ })).toBeVisible();
    await expect(panel.getByRole("textbox")).toHaveValue("");
    expect(chatRequests).toEqual([]);
  });

  test("opens a bottom sheet about the page on a phone, and the nav opens the same sheet", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width >= 1024, "Narrow screens use the bottom sheet");
    const lensUrl = "/en/lenses/x/fujifilm-xf-33mmf14-r-lm-wr-x";

    await page.goto(lensUrl);
    await page.getByRole("button", { name: /Ask Iris about this lens/ }).click();

    const sheet = page.getByRole("dialog", { name: "Iris" });
    await expect(sheet.getByText("Looking at")).toBeVisible();
    await expect(sheet.getByRole("textbox")).toBeInViewport();
    await expect(page).toHaveURL(new RegExp(`${lensUrl}$`));

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    const toggle = page.getByRole("banner").getByRole("button", { name: /^Ask Iris/ });
    await toggle.click();
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${lensUrl}$`));
    // The open sheet hides the rest of the page from assistive tech, the nav included, so the
    // button is found by its markup here rather than by role.
    await expect(page.locator('header button[aria-pressed="true"]')).toBeVisible();
  });
});
