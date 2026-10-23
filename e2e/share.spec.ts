import { test, expect, type Page } from "@playwright/test";

// The panel is a popover on wide screens and a drawer on phones; both hold the same content.
async function openShare(page: Page, name: RegExp) {
  const trigger = page.getByRole("button", { name }).locator("visible=true").first();
  await expect(async () => {
    await trigger.click();
    await expect(page.getByRole("tab", { name: "Link" })).toBeVisible({ timeout: 1000 });
  }).toPass();
}

test.describe("Share", () => {
  test("a lens page offers its spec poster", async ({ page }) => {
    await page.goto("/en/lenses/x/fujifilm-xf-16mmf14-r-wr-x", { waitUntil: "networkidle" });
    await openShare(page, /^Share$/);
    await expect(page.getByRole("heading", { name: "Share this lens" })).toBeVisible();
    await expect(page.locator('[data-redact-hook="posterQr"] svg')).toBeVisible();
  });

  test("a collection shares its link only", async ({ page }) => {
    await page.goto("/en/lenses/x/collections/pancake", { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: /^Share$/ }).locator("visible=true").first();
    await expect(async () => {
      await trigger.click();
      await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page.getByRole("tab", { name: "Image" })).toHaveCount(0);
  });

  test("the full weight ladder becomes a long image", async ({ page }) => {
    await page.goto("/en/lenses/x/charts/weight", { waitUntil: "networkidle" });
    await openShare(page, /Share this chart/);
    await expect(page.getByText(/^Long image, 1080 × \d+/)).toBeVisible();
    await expect(page.getByText("The heaviest weighs")).toBeVisible();
  });

  test("a filtered weight ladder poster shows only what the filter keeps", async ({ page }) => {
    await page.goto("/en/lenses/x/charts/weight?brand=sigma", { waitUntil: "networkidle" });
    await openShare(page, /Share this chart/);
    await expect(page.getByText(/Fujifilm X-mount lens weight ladder · Sigma, 11 lenses/)).toBeVisible();
  });

  test("a timeline poster keeps the highlighted brand", async ({ page }) => {
    await page.goto("/en/lenses/x/charts/timeline?brand=sigma", { waitUntil: "networkidle" });
    await openShare(page, /Share this chart/);
    await expect(page.getByText("Sigma lenses highlighted")).toBeVisible();
  });

  test("a brand page offers its lineup poster", async ({ page }) => {
    await page.goto("/en/lenses/x/brands/sigma", { waitUntil: "networkidle" });
    await openShare(page, /^Share$/);
    await expect(page.getByText(/Sigma's 11\s+Fujifilm X-mount lenses/)).toBeVisible();
    await expect(page.getByText("Scan to see the other 11 brands")).toBeVisible();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByText("Sigma's Fujifilm X-Mount Lenses by Release Year, 2022–2026")).toBeVisible();
  });
});
