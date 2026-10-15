import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { savedLocaleRedirect } from "../locale-preference";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost"), cookie ? { headers: { cookie } } : undefined);
}

describe("savedLocaleRedirect", () => {
  it("sends the bare root to the saved language", () => {
    const response = savedLocaleRedirect(request("/", "xg_locale=zh"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost/zh");
  });

  it("leaves the root to browser detection without a saved language", () => {
    expect(savedLocaleRedirect(request("/"))).toBeUndefined();
    expect(savedLocaleRedirect(request("/", "xg_locale=ja"))).toBeUndefined();
  });

  it("lets a localized URL win over the saved language", () => {
    expect(savedLocaleRedirect(request("/en/about", "xg_locale=zh"))).toBeUndefined();
  });
});
