// Must stay middleware.ts: Next 16 builds proxy.ts for the Node runtime, which Workers rejects.
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { INTERNAL_COOKIE } from "@/lib/analytics/session";
import { savedLocaleRedirect } from "@/lib/me/locale-preference";

// Internal param: keep the Obsidian doc "Internal params & cookies" in sync.
const COUNTRY_COOKIE = "xg_country";
const ONE_YEAR = 60 * 60 * 24 * 365;

const i18nMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (req.cookies.has(INTERNAL_COOKIE)) {
      return NextResponse.next();
    }
    const res = NextResponse.next();
    res.cookies.set(INTERNAL_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR,
    });
    return res;
  }

  const res = savedLocaleRedirect(req) ?? i18nMiddleware(req);
  const country = req.headers.get("cf-ipcountry");
  if (country) {
    res.cookies.set(COUNTRY_COOKIE, country, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR,
    });
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|api|icon|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
