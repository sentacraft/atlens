import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const INTERNAL_COOKIE = "xg_internal";
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

  return i18nMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|api|icon|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
