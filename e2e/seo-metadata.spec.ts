import { expect, test } from "@playwright/test";

// Regression: prerendered pages resolved metadataBase at build time, where Workers Builds
// has no SITE_URL, so every og:image pointed at http://localhost:3000.
test("social preview images use the production origin", async ({ page }) => {
  for (const path of ["/en", "/zh/about", "/en/lenses/x/browse"]) {
    await page.goto(path);
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image, path).toMatch(/^https:\/\/atlens\.app\//);
  }
});
