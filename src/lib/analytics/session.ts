import type { NextRequest } from "next/server";

type RequestCookies = NextRequest["cookies"];

export const VID_COOKIE = "atlens_vid";
export const VID_TTL_SECONDS = 30 * 24 * 60 * 60;

/** The anonymous visitor id, or null when the cookie is missing or malformed. */
export function readVid(cookies: RequestCookies): string | null {
  const value = cookies.get(VID_COOKIE)?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

// Forgeable on purpose: it only excludes the sender from analytics, and must never grant the
// rate-limit bypass.
export const INTERNAL_COOKIE = "atlens_internal";

export function isInternalBrowser(cookies: RequestCookies): boolean {
  return cookies.get(INTERNAL_COOKIE)?.value === "1";
}
