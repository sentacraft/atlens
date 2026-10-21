import { expect, test } from "@playwright/test";

const LENS = "fujifilm-xf-23mmf2-r-wr-x";
const BROWSE = "/en/lenses/x/browse";

test.describe("Lens preview", () => {
  test("opens over the page from a ?lens= link and closes back to the page", async ({ page }) => {
    await page.goto(`${BROWSE}?lens=${LENS}`);

    const preview = page.getByRole("dialog", { name: "Fujifilm XF 23mm F2 R WR" });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole("link", { name: "Open full page" })).toHaveAttribute("href", `/en/lenses/x/${LENS}`);
    await expect(preview.getByText("Focal Length", { exact: true })).toBeVisible();

    await preview.getByRole("button", { name: "Close" }).click();
    await expect(preview).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${BROWSE}$`));
  });

  test("leaves Iris's side panel usable beside it on a wide screen", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");

    await page.goto(BROWSE);
    await page.getByRole("button", { name: /Not sure which\? Ask Iris/ }).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    await expect(panel).toBeVisible();

    await page.evaluate((lens) => window.history.pushState(null, "", `${window.location.pathname}?lens=${lens}`), LENS);
    const preview = page.getByRole("dialog", { name: "Fujifilm XF 23mm F2 R WR" });
    await expect(preview).toBeVisible();

    const previewRight = await preview.evaluate((el) => el.getBoundingClientRect().right);
    const panelLeft = await panel.evaluate((el) => el.getBoundingClientRect().left);
    expect(previewRight).toBeLessThanOrEqual(panelLeft);
    await panel.getByRole("textbox").fill("How does it compare?");
    await expect(panel.getByRole("textbox")).toHaveValue("How does it compare?");

    await page.keyboard.press("Escape");
    await expect(preview).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${BROWSE}$`));
  });

  test("collapses expanded Iris so the preview shows beside it", async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    testInfo.skip(!viewport || viewport.width < 1024, "The side panel is for screens 1024px and wider");

    await page.goto(BROWSE);
    await page.getByRole("banner").getByRole("button", { name: /^Ask Iris/ }).click();
    const panel = page.getByRole("complementary", { name: "Iris" });
    const panelLeft = () => panel.evaluate((aside) => aside.getBoundingClientRect().left);
    await panel.getByRole("button", { name: "Open full screen" }).click();
    await expect.poll(panelLeft).toBe(0);

    await page.evaluate((lens) => window.history.pushState(null, "", `${window.location.pathname}?lens=${lens}`), LENS);
    const preview = page.getByRole("dialog", { name: "Fujifilm XF 23mm F2 R WR" });
    await expect(preview).toBeVisible();
    await expect
      .poll(async () => (await preview.evaluate((el) => el.getBoundingClientRect().right)) <= (await panelLeft()))
      .toBe(true);
  });
});
