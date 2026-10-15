// Must stay middleware.ts: Next 16 builds proxy.ts for the Node runtime, which Workers rejects.
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { INTERNAL_COOKIE } from "@/lib/analytics/session";
import { LOCALE_PREFERENCE_COOKIE, savedLocaleRedirectPath } from "@/lib/locale-preference";

// Internal param: keep the Obsidian doc "Internal params & cookies" in sync.
const COUNTRY_COOKIE = "atlens_country";
const ONE_YEAR = 60 * 60 * 24 * 365;

const i18nMiddleware = createMiddleware(routing);

function redirectKeepingQuery(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

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

  const savedPath = savedLocaleRedirectPath(
    req.nextUrl.pathname,
    req.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value,
  );
  const res = savedPath ? redirectKeepingQuery(req, savedPath) : i18nMiddleware(req);
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
