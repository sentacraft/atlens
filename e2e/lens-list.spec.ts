import { test, expect } from "@playwright/test";
import { LENS_CARD_LINK, selectBrandFilter } from "./helpers";

const RESULT_COUNT_RE = /\d+ (lenses|支镜头)/;

const countOf = (text: string) => parseInt(text.match(/\d+/)![0], 10);

test.describe("Lens list page", () => {
  test("lists lenses, and filters and sorts them with the filters kept in the URL", async ({ page }) => {
    await page.goto("/en/lenses/x");
    await expect(page).toHaveURL(/\/lenses\/x\/browse$/);
    const cards = page.locator(LENS_CARD_LINK);
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(10);

    const count = page.getByText(RESULT_COUNT_RE);
    await expect(count).toBeVisible();
    const allText = (await count.textContent())!;

    await selectBrandFilter(page, "Sigma");
    // Written with the click, not debounced.
    await expect(page).toHaveURL(/\/lenses\/x\/browse\?.*\bb=sigma\b/i, { timeout: 500 });
    await expect(count).not.toHaveText(allText);
    const sigmaText = (await count.textContent())!;
    expect(countOf(sigmaText)).toBeGreaterThan(0);
    expect(countOf(sigmaText)).toBeLessThan(countOf(allText));

    await page.reload();
    await expect(count).toHaveText(sigmaText);

    const standard = page.getByRole("button", { name: /^Standard/ });
    await standard.click();
    await expect(standard).toHaveAttribute("aria-pressed", "true");
    const combined = countOf((await count.textContent())!);
    expect(combined).toBeGreaterThan(0);
    expect(combined).toBeLessThanOrEqual(countOf(sigmaText));

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(count).toHaveText(allText);

    // Sorted on the full list: a narrow one can start with the same lens in both directions.
    const firstHref = (await cards.first().getAttribute("href"))!;
    await page.getByRole("button", { name: /ascending|descending/i }).click();
    await expect(cards.first()).not.toHaveAttribute("href", firstHref);
  });

  test("points to the cine collection after the photo lenses", { tag: "@local-only" }, async ({ page }) => {
    await page.goto("/en/lenses/x/browse?b=sigma");
    const prompt = page.getByRole("link", { name: /Looking for cine lenses/ });
    await expect(prompt).toHaveAttribute("href", "/en/lenses/x/collections/cine");
    // Below the last card, so only a short (filtered) list brings it into view.
    const lastCard = page.locator(LENS_CARD_LINK).last();
    expect((await prompt.boundingBox())!.y).toBeGreaterThan((await lastCard.boundingBox())!.y);
  });
});
