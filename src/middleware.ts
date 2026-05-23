import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { COUNTRY_COOKIE } from "./lib/affiliate";

const INTERNAL_COOKIE = "xg_internal";
const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_DAY = 60 * 60 * 24;

const i18nMiddleware = createMiddleware(routing);

function setCountryCookie(req: NextRequest, res: NextResponse): void {
  if (req.cookies.has(COUNTRY_COOKIE)) {
    return;
  }
  const country = req.headers.get("cf-ipcountry") ?? "US";
  res.cookies.set(COUNTRY_COOKIE, country, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_DAY,
  });
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

  const res = i18nMiddleware(req);
  setCountryCookie(req, res);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|api|icon|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
