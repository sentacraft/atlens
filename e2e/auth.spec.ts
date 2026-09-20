import { expect, test } from "@playwright/test";

test.describe("account access", () => {
  test("opens the sign-in dialog from the navigation", async ({ page }) => {
    await page.goto("/en/about");

    const login = page.getByRole("button", { name: "Log in", exact: true });
    await expect(login).toBeVisible();
    await login.click();

    const dialog = page.getByRole("dialog", { name: "Sign in to Atlens" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Send code" })).toBeVisible();
  });
});
