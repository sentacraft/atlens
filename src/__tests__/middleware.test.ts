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

describe("middleware initial vid minting", () => {
  it("sets an httpOnly atlens_vid UUID cookie on the first eligible GET visit", () => {
    const res = middleware(new NextRequest("http://localhost/en/lenses/x/xf-35mm"));
    const cookie = res.cookies.get("atlens_vid");
    expect(cookie?.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(2592000);
  });

  it("does not overwrite or refresh an existing valid atlens_vid cookie", () => {
    const existingVid = "11111111-2222-4333-8444-555555555555";
    const req = new NextRequest("http://localhost/en/lenses", {
      headers: { cookie: `atlens_vid=${existingVid}` },
    });
    const res = middleware(req);
    expect(res.cookies.get("atlens_vid")).toBeUndefined();
  });

  it("replaces a malformed atlens_vid cookie with a valid UUID", () => {
    const req = new NextRequest("http://localhost/en/lenses", {
      headers: { cookie: "atlens_vid=not-a-uuid" },
    });
    const res = middleware(req);
    const cookie = res.cookies.get("atlens_vid");
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/i);
    expect(cookie?.value).not.toBe("not-a-uuid");
  });

  it("skips minting atlens_vid when the visitor opted out of stats", () => {
    const req = new NextRequest("http://localhost/en/lenses", {
      headers: { cookie: "atlens_no_stats=1" },
    });
    expect(middleware(req).cookies.get("atlens_vid")).toBeUndefined();
  });

  it("skips minting atlens_vid for bot user agents", () => {
    const req = new NextRequest("http://localhost/en/lenses", {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    });
    expect(middleware(req).cookies.get("atlens_vid")).toBeUndefined();
  });

  it("skips minting atlens_vid on prefetch requests", () => {
    const nextPrefetch = new NextRequest("http://localhost/en/lenses", {
      headers: { "next-router-prefetch": "1" },
    });
    const secPrefetch = new NextRequest("http://localhost/en/lenses", {
      headers: { "sec-purpose": "prefetch" },
    });
    expect(middleware(nextPrefetch).cookies.get("atlens_vid")).toBeUndefined();
    expect(middleware(secPrefetch).cookies.get("atlens_vid")).toBeUndefined();
  });

  it("skips minting atlens_vid on non-GET requests", () => {
    const req = new NextRequest("http://localhost/en/lenses", { method: "POST" });
    expect(middleware(req).cookies.get("atlens_vid")).toBeUndefined();
  });
});
