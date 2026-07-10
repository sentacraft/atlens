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
