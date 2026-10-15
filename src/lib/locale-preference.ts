import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";

// Internal param: keep the Obsidian doc "Internal params & cookies" in sync.
export const LOCALE_PREFERENCE_COOKIE = "atlens_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function parseLocalePreference(value: string | undefined): Locale | undefined {
  return hasLocale(routing.locales, value) ? value : undefined;
}

/** Mirrors the account's language setting into a cookie the middleware can read without a session lookup. */
export function writeLocalePreference(locale: Locale | null): void {
  const current = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_PREFERENCE_COOKIE}=`))
    ?.split("=")[1];
  if ((current ?? null) === locale) {
    return;
  }
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = locale
    ? `${LOCALE_PREFERENCE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
    : `${LOCALE_PREFERENCE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/** Sends the bare "/" to the saved language; a localized URL always wins, so nothing else moves. */
export function savedLocaleRedirect(req: NextRequest): NextResponse | undefined {
  if (req.nextUrl.pathname !== "/") {
    return undefined;
  }
  const locale = parseLocalePreference(req.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value);
  if (!locale) {
    return undefined;
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}`;
  return NextResponse.redirect(url);
}
