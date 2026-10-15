import { describe, expect, it } from "vitest";
import { emailLocale, LOCALE_HEADER, savedLocaleRedirectPath } from "../locale-preference";

describe("savedLocaleRedirectPath", () => {
  it("sends the bare root to the saved language", () => {
    expect(savedLocaleRedirectPath("/", "zh")).toBe("/zh");
  });

  it("leaves the root to browser detection without a valid saved language", () => {
    expect(savedLocaleRedirectPath("/", undefined)).toBeUndefined();
    expect(savedLocaleRedirectPath("/", "ja")).toBeUndefined();
  });

  it("lets a localized URL win over the saved language", () => {
    expect(savedLocaleRedirectPath("/en/about", "zh")).toBeUndefined();
  });
});

describe("emailLocale", () => {
  it("prefers the saved language over the page's", () => {
    expect(emailLocale("en", new Headers({ [LOCALE_HEADER]: "zh" }))).toBe("en");
  });

  it("uses the locale the page sent when nothing is saved", () => {
    expect(emailLocale(null, new Headers({ [LOCALE_HEADER]: "zh" }))).toBe("zh");
  });

  it("falls back to the default locale for a missing or unknown value", () => {
    expect(emailLocale(null, new Headers())).toBe("en");
    expect(emailLocale(null, new Headers({ [LOCALE_HEADER]: "fr" }))).toBe("en");
    expect(emailLocale(null, undefined)).toBe("en");
  });
});
