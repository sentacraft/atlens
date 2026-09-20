import { expect, test } from "@playwright/test";

test.describe("account access", () => {
  test("opens the sign-in dialog from the navigation", async ({ page }) => {
    await page.goto("/zh/about");

    const login = page.getByRole("button", { name: "登录", exact: true });
    await expect(login).toBeVisible();
    await login.click();

    const dialog = page.getByRole("dialog", { name: "登录 Atlens" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "使用 Google 登录" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "邮箱" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "发送验证码" })).toBeVisible();
  });
});
