/** The slice of a request's cookies these helpers read; a NextRequest's cookies are one. */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

/** Reads cookies from a raw Cookie header. */
export function cookieReader(header: string | null | undefined): CookieReader {
  const cookies = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) {
      cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
    }
  }
  return { get: (name) => (cookies.has(name) ? { value: cookies.get(name)! } : undefined) };
}

export const VID_COOKIE = "atlens_vid";
export const VID_TTL_SECONDS = 30 * 24 * 60 * 60;

/** The anonymous visitor id, or null when the cookie is missing or malformed. */
export function readVid(cookies: CookieReader): string | null {
  const value = cookies.get(VID_COOKIE)?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

// Forgeable on purpose: it only excludes the sender from analytics, and must never grant the
// rate-limit bypass.
export const INTERNAL_COOKIE = "atlens_internal";

export function isInternalBrowser(cookies: CookieReader): boolean {
  return cookies.get(INTERNAL_COOKIE)?.value === "1";
}
