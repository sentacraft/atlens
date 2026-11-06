import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next-intl/middleware", () => ({ default: () => () => NextResponse.next() }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["en", "zh"], defaultLocale: "en" } }));

const { default: middleware } = await import("../middleware");

describe("middleware internal marking", () => {
  it("sets the internal cookie and strips ?internal=1 from the URL", () => {
    const res = middleware(new NextRequest("http://localhost/en/lenses?internal=1&mount=x"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/en/lenses?mount=x");
    expect(res.headers.get("set-cookie")).toMatch(/atlens_internal=1.*Max-Age=31536000/i);
  });

  it("refreshes the internal cookie on later visits", () => {
    const req = new NextRequest("http://localhost/en/lenses", { headers: { cookie: "atlens_internal=1" } });
    expect(middleware(req).headers.get("set-cookie")).toMatch(/atlens_internal=1/i);
  });

  it("leaves other visitors unmarked", () => {
    const res = middleware(new NextRequest("http://localhost/en/lenses"));
    expect(res.headers.get("set-cookie") ?? "").not.toMatch(/atlens_internal/i);
  });
});
