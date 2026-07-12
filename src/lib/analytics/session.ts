// The anonymous first-party session cookie (`xg_sid`) that ties one visitor's
// events together. `/api/track` owns it — it mints and refreshes the cookie on a
// sliding TTL; every other route only reads it. The cookie name, TTL, and parser
// live here so each reader validates the same format and no route hardcodes a
// second copy. Sid is the only identifier that crosses requests.
export const SID_COOKIE = "xg_sid";
export const SID_TTL_SECONDS = 1800;

// Read a valid sid out of a Cookie header, or null if absent / malformed. A sid is
// a v4-style uuid; anything else is ignored so a forged cookie can't inject junk.
export function parseSid(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === SID_COOKIE && v && /^[0-9a-f-]{36}$/i.test(v)) {
      return v;
    }
  }
  return null;
}

// Marks traffic to keep out of the dashboards (dogfooding, load tests). A mere
// presence flag — forgeable, but the only privilege it grants is self-exclusion
// from analytics, so a forged one is harmless. A valid rate-limit bypass also
// implies internal (the callers OR it in); the reverse is deliberately not true —
// this flag must never grant the bypass, which is why bypass checks a secret.
export const INTERNAL_COOKIE = "xg_internal";

export function parseInternal(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === INTERNAL_COOKIE && v === "1") {
      return true;
    }
  }
  return false;
}
