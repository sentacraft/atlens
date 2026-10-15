import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

// Every rule for picking a language when the URL does not name one lives here; a localized
// URL always wins, and next-intl's useLocale() reads that.

/** Carries the page locale on Better Auth requests so its emails can match the UI language. */
export const LOCALE_HEADER = "x-atlens-locale";

// Internal param: keep the Obsidian doc "Internal params & cookies" in sync.
export const LOCALE_PREFERENCE_COOKIE = "atlens_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function asLocale(value: string | null | undefined): Locale | undefined {
  return hasLocale(routing.locales, value) ? value : undefined;
}

/** Where the bare "/" goes for a visitor with a saved language; undefined leaves it to next-intl. */
export function savedLocaleRedirectPath(pathname: string, cookieValue: string | undefined): string | undefined {
  const locale = pathname === "/" ? asLocale(cookieValue) : undefined;
  return locale && `/${locale}`;
}

/** Auth emails use the account's saved language, then the language of the page that asked. */
export function emailLocale(saved: Locale | null, headers: Headers | undefined): Locale {
  return saved ?? asLocale(headers?.get(LOCALE_HEADER)) ?? routing.defaultLocale;
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
