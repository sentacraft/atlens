import { test, expect } from "@playwright/test";

test.describe("Ask Iris privacy notice", () => {
  test("opens the privacy popover below the composer", async ({ page }) => {
    await page.goto("/en/askiris");

    await page.getByTestId("askiris-privacy-trigger").click();

    const popup = page.getByRole("dialog");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Your messages and the AI's replies may be retained");
    await expect(popup.getByRole("link", { name: "Read the full privacy notice" })).toHaveAttribute(
      "href",
      "/en/about#privacy",
    );
  });

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
