// Regression: iOS Safari linked the profile's email (and phone-like numbers) by itself.

import { expect, test } from "@playwright/test";

test("tells iOS not to turn emails, numbers or addresses into links", async ({ page }) => {
  await page.goto("/en/me");

  const content = await page.locator('meta[name="format-detection"]').getAttribute("content");
  for (const kind of ["email=no", "telephone=no", "address=no"]) {
    expect(content).toContain(kind);
  }
});

test("keeps the contact email a link where people are meant to write to it", async ({ page }) => {
  await page.goto("/en/about");

  await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
});
