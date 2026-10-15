import { describe, expect, it } from "vitest";
import { deleteAccountEmail, signInCodeEmail } from "../auth-email";

describe("signInCodeEmail", () => {
  it("writes the code in the requested language", () => {
    const email = signInCodeEmail("zh", "123456");

    expect(email.subject).toBe("你的 Atlens 登录验证码");
    expect(email.text).toContain("123456");
    expect(email.text).not.toContain("<strong>");
    expect(email.html).toContain("<strong>123456</strong>");
  });
});

describe("deleteAccountEmail", () => {
  it("links to the confirmation url in the requested language", () => {
    const url = "https://atlens.app/api/auth/delete-user/callback?token=t";
    const email = deleteAccountEmail("zh", url);

    expect(email.subject).toBe("确认删除你的 Atlens 账号");
    expect(email.text).toContain(url);
    expect(email.html).toContain(`<a href="${url}">删除我的 Atlens 账号</a>`);
  });
});
