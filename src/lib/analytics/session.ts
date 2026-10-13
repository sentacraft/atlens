export const SID_COOKIE = "xg_sid";
export const SID_TTL_SECONDS = 1800;

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

// Forgeable on purpose: it only excludes the sender from analytics, and must never grant the
// rate-limit bypass.
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
