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

// Regression: next-intl's middleware sent its own hreflang Link header, whose x-default (an
// unprefixed URL that redirects) disagreed with the page's <link rel="alternate">.
test("hreflang comes only from the page head, not a Link header", async ({ request }) => {
  for (const path of ["/en", "/zh/lenses/x/collections/pancake"]) {
    const response = await request.get(path);
    expect(response.headers()["link"] ?? "", path).not.toContain("hreflang");
  }
});

test("the charts section redirects permanently to its first chart", async ({ request }) => {
  const response = await request.get("/en/lenses/x/charts", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toMatch(/\/en\/lenses\/x\/charts\/timeline$/);
});
