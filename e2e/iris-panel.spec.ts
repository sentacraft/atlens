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

  test("drafts the question in the side panel without sending it", async ({ page }, testInfo) => {
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
    await expect(panel.getByRole("textbox")).toHaveValue("What are the main differences between these?");
    expect(chatRequests).toEqual([]);
  });

  test("takes the question and the page it came from to Ask Iris on a phone", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width >= 1024, "Phones go to the Ask Iris page");

    await page.goto("/en/lenses/x/fujifilm-xf-33mmf14-r-lm-wr-x");
    await page.getByRole("button", { name: /Ask Iris about this lens/ }).click();

    await expect(page).toHaveURL(/\/en\/askiris$/);
    await expect(page.getByRole("textbox")).toHaveValue("What is this lens good for?");
  });
});
