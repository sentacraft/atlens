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

// Regression: the lens list's heading shared the meta title, which gained a {count} the heading never passed.
test("the lens list heading names how many lenses it holds", async ({ page }) => {
  for (const [path, pattern] of [
    ["/zh/lenses/x/browse", /^富士 X 卡口镜头库：全部 \d+ 支$/],
    ["/en/lenses/x/browse", /^All \d+ Fujifilm X-Mount Lenses/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(pattern);
  }
});
