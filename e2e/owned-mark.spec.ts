import { test, expect, type Page } from "@playwright/test";

const OWNED_ID = "fujifilm-xf-33mmf14-r-lm-wr-x";

/** Signs the page in and puts the given catalog lenses in the user's gear, without a backend. */
async function signInOwning(page: Page, ...catalogIds: string[]) {
  const now = Date.now();
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: { id: "s1", userId: "u1", token: "t", expiresAt: new Date(now + 86_400_000).toISOString(), createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
        user: { id: "u1", name: "Test", email: "test@example.com", emailVerified: true, isAnonymous: false, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
      },
    }),
  );
  await page.route("**/api/me/gear", (route) =>
    route.fulfill({
      json: {
        gear: catalogIds.map((catalogId, i) => ({ id: `g${i}`, kind: "lens", catalogId, name: catalogId, brand: "fujifilm", mount: "X", createdAt: now })),
      },
    }),
  );
}

// The pill sits on the thumbnail's top-left and the card's own content never moves for it.
for (const width of [320, 375, 1280]) {
  test.describe(`owned mark on the lens list at ${width}px`, () => {
    const phone = width < 768;
    test.use({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone });

    for (const locale of ["en", "zh"] as const) {
      test(`${locale}: the pill is inside the thumbnail and moves nothing`, async ({ page }) => {
        await page.goto(`/${locale}/lenses/x/browse`);
        const link = page.locator(`a[href$="/${OWNED_ID}"]`).first();
        await expect(link).toBeAttached();
        const before = await link.boundingBox();

        await signInOwning(page, OWNED_ID);
        await page.reload();
        const pill = page.getByText(locale === "en" ? "Owned" : "已拥有", { exact: true }).first();
        await expect(pill).toBeVisible();
        await expect(page.getByText(locale === "en" ? "Owned" : "已拥有", { exact: true })).toHaveCount(1);

        const media = pill.locator("xpath=ancestor::div[contains(@class,'aspect-')][1]");
        const m = (await media.boundingBox())!;
        const p = (await pill.boundingBox())!;
        expect(p.x).toBeGreaterThanOrEqual(m.x);
        expect(p.y).toBeGreaterThanOrEqual(m.y);
        expect(p.x + p.width, "the pill fits inside the thumbnail").toBeLessThanOrEqual(m.x + m.width);
        expect(p.y + p.height).toBeLessThanOrEqual(m.y + m.height);

        const after = await page.locator(`a[href$="/${OWNED_ID}"]`).first().boundingBox();
        expect(after).toEqual(before);
        await pill.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/owned-list-${locale}-${width}.png`, fullPage: false });
      });
    }
  });
}

test("guests see no owned mark anywhere on the list", async ({ page }) => {
  await page.goto("/en/lenses/x/browse");
  await expect(page.locator(`a[href$="/${OWNED_ID}"]`).first()).toBeAttached();
  await expect(page.getByText("Owned", { exact: true })).toHaveCount(0);
});

for (const width of [375, 1280]) {
  test(`chart tile gets a dot with the label as its name at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInOwning(page, OWNED_ID);
    await page.goto("/en/lenses/x/brands/fujifilm");
    const dot = page.getByRole("img", { name: "Owned" }).first();
    await expect(dot).toBeAttached();
    await expect(dot).toHaveAttribute("title", "Owned");
    const tile = dot.locator("xpath=ancestor::a[1]");
    await expect(tile).toHaveAttribute("aria-label", /33mm/);
    await dot.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/owned-chart-${width}.png` });
  });
}
