// Must stay middleware.ts: Next 16 builds proxy.ts for the Node runtime, which Workers rejects.
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  INTERNAL_COOKIE,
  INTERNAL_COOKIE_MAX_AGE,
  VID_COOKIE,
  VID_TTL_SECONDS,
  isOptedOutOfStats,
  readVid,
} from "@/lib/analytics/session";
import { classifyUserAgent } from "@/lib/analytics/request-class";
import { LOCALE_PREFERENCE_COOKIE, savedLocaleRedirectPath } from "@/lib/locale-preference";

// Internal param: keep the Obsidian doc "Internal params & cookies" in sync.
const COUNTRY_COOKIE = "atlens_country";
const ONE_YEAR = 60 * 60 * 24 * 365;

function markInternal(res: NextResponse) {
  res.cookies.set(INTERNAL_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: INTERNAL_COOKIE_MAX_AGE,
  });
  return res;
}

function isPrefetch(req: NextRequest): boolean {
  return (
    req.headers.get("next-router-prefetch") !== null ||
    req.headers.get("purpose") === "prefetch" ||
    (req.headers.get("sec-purpose") ?? "").includes("prefetch")
  );
}

function shouldMintVid(req: NextRequest): boolean {
  return (
    req.method === "GET" &&
    !readVid(req.cookies) &&
    !isOptedOutOfStats(req.cookies) &&
    !isPrefetch(req) &&
    classifyUserAgent(req.headers.get("user-agent")) !== "bot"
  );
}

const i18nMiddleware = createMiddleware(routing);

function redirectKeepingQuery(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    return markInternal(NextResponse.next());
  }
  if (req.nextUrl.searchParams.get("internal") === "1") {
    const url = req.nextUrl.clone();
    url.searchParams.delete("internal");
    return markInternal(NextResponse.redirect(url));
  }

  const savedPath = savedLocaleRedirectPath(
    req.nextUrl.pathname,
    req.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value,
  );
  const res = savedPath ? redirectKeepingQuery(req, savedPath) : i18nMiddleware(req);
  if (req.cookies.has(INTERNAL_COOKIE)) {
    markInternal(res);
  }
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
  // Mint atlens_vid on the HTML response so concurrent mount-time /api/track calls share one vid.
  if (shouldMintVid(req)) {
    res.cookies.set(VID_COOKIE, crypto.randomUUID(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VID_TTL_SECONDS,
    });
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|api|icon|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
