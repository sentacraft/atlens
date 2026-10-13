import { describe, expect, it } from "vitest";
import { authEmailLocale, deleteAccountEmail, signInCodeEmail } from "../auth-email";
import { AUTH_LOCALE_HEADER } from "../auth-locale";

describe("authEmailLocale", () => {
  it("uses the locale the page sent", () => {
    expect(authEmailLocale(new Headers({ [AUTH_LOCALE_HEADER]: "zh" }))).toBe("zh");
  });

  it("falls back to the default locale for a missing or unknown value", () => {
    expect(authEmailLocale(new Headers())).toBe("en");
    expect(authEmailLocale(new Headers({ [AUTH_LOCALE_HEADER]: "fr" }))).toBe("en");
    expect(authEmailLocale(undefined)).toBe("en");
  });
});

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
