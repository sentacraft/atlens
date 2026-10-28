import { expect, test } from "@playwright/test";

test.describe("account access", () => {
  test("opens the sign-in dialog from the navigation", async ({ page }) => {
    await page.goto("/en/about");

    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("menuitem", { name: "About" })).toBeVisible();
    await page.getByRole("menuitem", { name: /^Sign in \/ Sign up/ }).click();

    const dialog = page.getByRole("dialog", { name: "Sign in or sign up to Atlens" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Send code" })).toBeVisible();
  });
});
