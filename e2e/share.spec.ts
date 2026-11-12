import { test, expect, type Page } from "@playwright/test";
import { datedLenses, sigmaLenses, sigmaYears, stillsBrands, stillsLenses, yearSpan } from "./support/chart-catalog";

const englishNumber = new Intl.NumberFormat("en");
const sigmaLineupTitle = `Sigma's ${englishNumber.format(sigmaLenses.length)} Fujifilm X-mount lenses`;

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
    const weights = stillsLenses.map(({ weightG }) => typeof weightG === "number" ? weightG : (weightG[0] + weightG[1]) / 2);
    const max = englishNumber.format(Math.max(...weights));
    const min = englishNumber.format(Math.min(...weights));
    const count = englishNumber.format(stillsLenses.length);
    const brands = englishNumber.format(stillsBrands.size);
    await page.goto("/en/lenses/x/charts/weight", { waitUntil: "networkidle" });
    await openShare(page, /^Share$/);
    await expect(page.getByText("Long image · scroll to preview, tap to enlarge")).toBeVisible();
    await expect(page.getByText(`${count} lenses from ${brands} brands, ${max}g down to ${min}g.`)).toBeVisible();
  });

  test("a filtered weight ladder poster shows only what the filter keeps", async ({ page }) => {
    const count = sigmaLenses.length;
    await page.goto("/en/lenses/x/charts/weight?brand=sigma", { waitUntil: "networkidle" });
    await openShare(page, /^Share$/);
    await expect(page.getByText(`Sigma, ${englishNumber.format(count)} ${count === 1 ? "lens" : "lenses"}.`, { exact: true })).toBeVisible();
  });

  test("a timeline poster keeps the highlighted brand", async ({ page }) => {
    const otherLenses = datedLenses.filter((lens) => lens.brand !== "sigma");
    const otherBrands = new Set(otherLenses.map((lens) => lens.brand)).size;
    const highlighted = `${englishNumber.format(sigmaYears.length)} ${sigmaYears.length === 1 ? "lens" : "lenses"}`;
    const brands = `${englishNumber.format(otherBrands)} other ${otherBrands === 1 ? "brand" : "brands"}`;
    await page.goto("/en/lenses/x/charts/timeline?brand=sigma", { waitUntil: "networkidle" });
    await openShare(page, /^Share$/);
    await expect(page.getByText(`Sigma on the all-brand timeline · ${yearSpan(datedLenses.map((lens) => lens.year))}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Sigma's ${highlighted} highlighted; the other ${englishNumber.format(otherLenses.length)} are from ${brands}`, { exact: true })).toBeVisible();
  });

  test("a brand page offers its lineup poster", async ({ page }) => {
    await page.goto("/en/lenses/x/brands/sigma", { waitUntil: "networkidle" });
    await openShare(page, /^Share$/);
    await expect(page.getByText(sigmaLineupTitle)).toBeVisible();
    await expect(page.getByText(`Scan to see the other ${englishNumber.format(stillsBrands.size - 1)} brands`)).toBeVisible();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByText(`Sigma's Fujifilm X-Mount Lenses by Release Year, ${yearSpan(sigmaYears)}`)).toBeVisible();
  });

  test("a brand page section shares only its own chart", async ({ page }) => {
    await page.goto("/en/lenses/x/brands/sigma", { waitUntil: "networkidle" });
    await openShare(page, /^Share this chart$/);
    await expect(page.getByText(sigmaLineupTitle)).toBeVisible();
    await expect(page.getByRole("button", { name: "Timeline", exact: true })).toHaveCount(0);
  });
});
