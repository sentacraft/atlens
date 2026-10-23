import { test, expect } from "@playwright/test";

const TIMELINE = "/en/lenses/x/charts/timeline";
const WEIGHT = "/en/lenses/x/charts/weight";
const LINEUPS = "/en/lenses/x/charts/lineups";
const BRANDS = "/en/lenses/x/brands";
const LENS = /15mm F1\.4 DC \| Contemporary/;

// The charts are in the static HTML, so an action can land before hydration attaches its
// handlers; each interaction retries until the client responds. A tap that lands too early follows
// the link, so the tap tests also wait for the network to settle first.
test.describe("Charts", () => {
  test("/charts redirects to the timeline", async ({ page }) => {
    await page.goto("/en/lenses/x/charts");
    await expect(page).toHaveURL(new RegExp(`${TIMELINE}$`));
  });

  test("a tap on a timeline lens opens its sheet instead of the lens page", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "Touch only; a mouse click opens the lens page");
    const lens = page.getByRole("link", { name: LENS }).locator("visible=true");
    const sheet = page.getByRole("dialog");
    await expect(async () => {
      await page.goto(TIMELINE, { waitUntil: "networkidle" });
      await lens.tap();
      await expect(sheet.getByRole("heading", { name: LENS })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page).toHaveURL(new RegExp(`${TIMELINE}$`));
    await sheet.getByRole("link", { name: "View details" }).click();
    await expect(page).toHaveURL(/\/en\/lenses\/x\/sigma-[^/]+-x$/);
  });

  test("hovering a timeline lens opens its card", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "Mouse only");
    await page.goto(TIMELINE);
    await expect(async () => {
      await page.mouse.move(0, 0);
      await page.getByRole("link", { name: LENS }).locator("visible=true").hover();
      await expect(page.getByRole("tooltip").filter({ hasText: LENS })).toBeVisible({ timeout: 1000 });
    }).toPass();
  });

  test("a pinned brand is kept in the URL and restored on reload", async ({ page }) => {
    await page.goto(TIMELINE);
    const chip = page.getByRole("group", { name: "Highlight brand" }).getByRole("button", { name: /^Sigma/ });
    await expect(async () => {
      if ((await chip.getAttribute("aria-pressed")) !== "true") {
        await chip.click();
      }
      await expect(page).toHaveURL(/[?&]brand=sigma\b/, { timeout: 1000 });
    }).toPass();

    await page.reload();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  test("the weight ladder filters by the brand in the URL", async ({ page }) => {
    await page.goto(`${WEIGHT}?brand=tamron&focal=standard`);
    await expect(page.getByRole("group", { name: "Brand" }).getByRole("button", { name: /^Tamron/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("group", { name: "Focal range" }).getByRole("button", { name: "Standard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const tiles = page.locator("main section li a");
    await expect(tiles.first()).toBeVisible();
    for (const label of await tiles.evaluateAll((links) => links.map((l) => l.getAttribute("aria-label")))) {
      expect(label).toMatch(/^Tamron /);
    }
  });

  test("a tap on a weight ladder tile opens its sheet instead of the lens page", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "Touch only; mouse users get the tile's own buttons");
    // Phones show only the first tiles of each tier, so tap one that is on screen.
    const sheet = page.getByRole("dialog");
    await expect(async () => {
      await page.goto(WEIGHT, { waitUntil: "networkidle" });
      await page.locator("main section li a").locator("visible=true").first().tap();
      await expect(sheet).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page).toHaveURL(new RegExp(`${WEIGHT}$`));
    const compare = sheet.getByRole("button", { name: "Add to compare" });
    await compare.click();
    await expect(sheet.getByRole("button", { pressed: true })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "View details" })).toBeVisible();
  });

  test("a weight ladder tile shows its compare button only on hover", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "Mouse only");
    await page.goto(WEIGHT);
    const compare = page.getByRole("button", { name: "Add to compare: Fujifilm XF 16mm F1.4 R WR" });
    await expect(compare).toHaveCSS("opacity", "0");
    await expect(async () => {
      await page.mouse.move(0, 0);
      await page.getByRole("link", { name: "Fujifilm XF 16mm F1.4 R WR" }).hover();
      await expect(compare).toHaveCSS("opacity", "1", { timeout: 1000 });
    }).toPass();
  });

  test("an old brand collection URL moves to the brand page", async ({ page }) => {
    await page.goto("/en/lenses/x/collections/viltrox");
    await expect(page).toHaveURL(new RegExp(`${BRANDS}/viltrox$`));
  });

  test("a brand page links to the other brand pages", async ({ page }) => {
    await page.goto(`${BRANDS}/fujifilm`);
    await expect(page.getByRole("navigation", { name: "Other brands" }).getByRole("link", { name: /^Fujifilm/ })).toHaveCount(0);
    await page.getByRole("navigation", { name: "Other brands" }).getByRole("link", { name: /^Sigma/ }).click();
    await expect(page).toHaveURL(new RegExp(`${BRANDS}/sigma$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sigma Lenses for Fujifilm X-Mount");
  });

  test("hovering a lens in a brand lineup shows its card", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "Mouse only");
    await page.goto(`${BRANDS}/sigma`);
    const lens = page.getByRole("link", { name: "18-50mm F2.8 DC DN | Contemporary", exact: true });
    await expect(async () => {
      await page.mouse.move(0, 0);
      await lens.hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "18-50mm" })).toBeVisible({ timeout: 1000 });
    }).toPass();
  });

  test("the lineups chart opens each brand page", async ({ page }) => {
    await page.goto(LINEUPS);
    await page.getByRole("link", { name: /^Viltrox/ }).click();
    await expect(page).toHaveURL(new RegExp(`${BRANDS}/viltrox$`));
  });

  test("a chart with a brand selected links to that brand's page", async ({ page }) => {
    await page.goto(`${TIMELINE}?brand=sigma`);
    await expect(page.getByRole("link", { name: "See all 11 Sigma lenses →" })).toHaveAttribute("href", `${BRANDS}/sigma`);
  });

  test("a brand with release years has its own timeline, linked to the all-brand one", async ({ page }) => {
    await page.goto(`${BRANDS}/sigma`);
    const section = page.locator("section#timeline");
    await expect(section.getByRole("heading", { name: "Release timeline" })).toBeVisible();
    await expect(section.getByText("2022–2026 · 11 lenses")).toBeVisible();
    await expect(section.getByRole("link", { name: "See it on the all-brand timeline →" })).toHaveAttribute(
      "href",
      `${TIMELINE}?brand=sigma`,
    );
  });

  test("a brand without release years has no timeline", async ({ page }) => {
    await page.goto(`${BRANDS}/viltrox`);
    await expect(page.getByRole("heading", { name: "Lineup" })).toBeVisible();
    await expect(page.locator("section#timeline")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "On this page" }).getByRole("link")).toHaveText(["Lineup", "All 16 lenses"]);
  });

  test("the brand on a lens page links to the brand page", async ({ page }) => {
    await page.goto("/en/lenses/x/sigma-contemporary-18-50mm-f28-dc-dn-x");
    await expect(page.getByRole("link", { name: "Sigma", exact: true })).toHaveAttribute("href", `${BRANDS}/sigma`);
  });
});
