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
        await expect(pill).toBeVisible({ timeout: 15_000 });
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

test.setTimeout(90_000);

const LABEL = { en: "Owned", zh: "已拥有" } as const;
const COMPARE_IDS = [OWNED_ID, "fujifilm-mkx-18-55mmt29-x", "fujifilm-mkx-50-135mmt29-x"];

// The label takes a fixed line under each model, so owning a lens moves nothing.
for (const width of [375, 1280]) {
  test.describe(`compare header at ${width}px`, () => {
    const phone = width < 768;
    test.use({ viewport: { width, height: 900 }, isMobile: phone, hasTouch: phone });

    for (const locale of ["en", "zh"] as const) {
      test(`${locale}: the label sits under the model name and no column shifts`, async ({ page }) => {
        const url = `/${locale}/lenses/x/compare?ids=${COMPARE_IDS.join(",")}`;
        await page.goto(url);
        const link = page.locator(`a[href$="/${OWNED_ID}"]`).first();
        await expect(link).toBeVisible();
        const headers = page.locator("th").filter({ has: page.locator("a[href*='/lenses/x/']") });
        const before = await headers.evaluateAll((ths) => ths.map((th) => th.getBoundingClientRect().height));

        await signInOwning(page, OWNED_ID);
        await page.reload();
        const label = page.getByText(LABEL[locale], { exact: true });
        await expect(label).toBeVisible({ timeout: 15_000 });
        await expect(label).toHaveCount(1);
        const model = (await label.locator("xpath=../preceding-sibling::p[1]").boundingBox())!;
        const mark = (await label.boundingBox())!;
        expect(mark.y, "directly below the model name").toBeGreaterThanOrEqual(model.y + model.height - 1);
        expect(mark.y).toBeLessThan(model.y + model.height + 12);

        const after = await headers.evaluateAll((ths) => ths.map((th) => th.getBoundingClientRect().height));
        expect(after).toEqual(before);
        await page.screenshot({ path: `test-results/owned-compare-${locale}-${width}.png` });
      });
    }
  });
}

// A tap opens the lens sheet (a drawer on a phone, a centered dialog on a wide screen); the chart tiles stay unmarked.
for (const width of [375, 1280]) {
  test.describe(`chart lens sheet at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: true });

    for (const locale of ["en", "zh"] as const) {
      test(`${locale}: the sheet labels an owned lens beside its brand; the tiles carry no mark`, async ({ page }) => {
        await signInOwning(page, OWNED_ID);
        const lens = page.getByRole("link", { name: /33mm F1\.4 R LM WR/ }).locator("visible=true").first();
        const sheet = page.getByRole("dialog");
        await expect(async () => {
          await page.goto(`/${locale}/lenses/x/charts/timeline`, { waitUntil: "networkidle" });
          await lens.tap();
          await expect(sheet).toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 60_000 });
        await expect(sheet.getByText(LABEL[locale], { exact: true })).toBeVisible({ timeout: 15_000 });
        await page.screenshot({ path: `test-results/owned-sheet-${locale}-${width}.png` });
        await expect(page.getByRole("img", { name: LABEL[locale] })).toHaveCount(0);
      });
    }
  });
}

test("favorites carry no owned mark", async ({ page }) => {
  await signInOwning(page, OWNED_ID);
  await page.route("**/api/me/favorites", (route) => route.fulfill({ json: { favorites: [{ lensId: OWNED_ID }] } }));
  await page.goto("/en/me#favorites");
  await expect(page.getByRole("link", { name: /XF 33mm F1\.4 R LM WR/ }).first()).toBeVisible();
  await expect(page.getByText("Owned", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Owned" })).toHaveCount(0);
});
