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

  it("moves a URL in another language to the saved language", () => {
    expect(savedLocaleRedirectPath("/en/about", "zh")).toBe("/zh/about");
    expect(savedLocaleRedirectPath("/en", "zh")).toBe("/zh");
    expect(savedLocaleRedirectPath("/zh/lens/xf-23mm", "en")).toBe("/en/lens/xf-23mm");
  });

  it("leaves a URL already in the saved language alone", () => {
    expect(savedLocaleRedirectPath("/zh/about", "zh")).toBeUndefined();
  });

  it("leaves localized URLs alone without a valid saved language", () => {
    expect(savedLocaleRedirectPath("/en/about", undefined)).toBeUndefined();
    expect(savedLocaleRedirectPath("/en/about", "ja")).toBeUndefined();
  });

  it("leaves paths without a locale segment to next-intl", () => {
    expect(savedLocaleRedirectPath("/admin", "zh")).toBeUndefined();
    expect(savedLocaleRedirectPath("/english", "zh")).toBeUndefined();
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
