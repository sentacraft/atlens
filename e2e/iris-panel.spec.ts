import { expect, test } from "@playwright/test";

test.describe("Ask Iris side panel", () => {
  test.beforeEach(({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");
  });

  test("opens from the nav beside the page, follows navigation, and closes", async ({ page }) => {
    await page.goto("/en/lenses/x/browse");
    await page.getByRole("banner").getByRole("link", { name: /^Ask Iris/ }).click();

    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel).toBeVisible();
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

  test("takes the page it came from to Ask Iris on a phone", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width >= 1024, "Phones go to the Ask Iris page");

    await page.goto("/en/lenses/x/fujifilm-xf-33mmf14-r-lm-wr-x");
    await page.getByRole("button", { name: /Ask Iris about this lens/ }).click();

    await expect(page).toHaveURL(/\/en\/askiris$/);
    await expect(page.getByText("Looking at")).toBeVisible();
    await expect(page.getByRole("button", { name: /Back to/ })).toBeVisible();
  });
});
