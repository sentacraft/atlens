import { expect, test } from "@playwright/test";

test.describe("account access", () => {
  test("opens the sign-in dialog from the navigation", async ({ page }) => {
    await page.goto("/en/about");

    const menu = page.getByRole("button", { name: "Menu" });
    const login = page.getByRole("menuitem", { name: /^Log in/ });
    await menu.click();
    await expect(page.getByRole("menuitem", { name: "About" })).toBeVisible();
    await expect(login).toHaveCount(0);

    await page.goto("/en/about?testhook=1");
    await menu.click();
    await login.click();

    const dialog = page.getByRole("dialog", { name: "Sign in to Atlens" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Send code" })).toBeVisible();
  });
});
