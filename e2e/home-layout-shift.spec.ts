// Regression: the random tagline under the collections appeared only after hydration and pushed
// the whole centered hero up as it did.

import { test, expect } from "@playwright/test";

test("the home page does not shift once it has loaded", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Layout shift entries are Chromium-only");
  await page.addInitScript(() => {
    const shifts: number[] = [];
    (window as unknown as { __shifts: number[] }).__shifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        shifts.push((entry as PerformanceEntry & { value: number }).value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  // Gives the hydrated client a moment to settle before reading the shifts.
  await page.waitForTimeout(1000);

  const shifts = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts);
  expect(shifts).toEqual([]);
});
