import { test, expect } from "@playwright/test";

test.describe("About content", () => {
  test("About includes the Ask Iris feature and privacy sections", async ({ page }) => {
    await page.goto("/en/about");

    const askIrisSection = page.locator("#ask-iris");
    await expect(askIrisSection).toContainText("conversational lens assistant");
    await expect(askIrisSection.getByRole("link", { name: "Ask Iris" })).toHaveAttribute(
      "href",
      "/en/askiris",
    );
    await expect(page.locator("#privacy")).toContainText("your messages are sent to an AI provider");
    await expect(page.locator("#privacy")).toContainText("This site uses Cloudflare Analytics");

    const sectionIds = await page.locator("section").evaluateAll((sections) =>
      sections.map((section) => section.id),
    );
    expect(sectionIds.indexOf("ask-iris")).toBe(sectionIds.indexOf("data-accuracy") + 1);
  });
});

test.describe("Ask Iris page", () => {
  test("does not render a privacy notice entry below the composer", async ({ page }) => {
    await page.goto("/en/askiris");

    await expect(page.getByTestId("askiris-privacy-trigger")).toHaveCount(0);
  });
});
