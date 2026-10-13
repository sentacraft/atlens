import "server-only";

const keys = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    keys.set(secret, key);
  }
  return key;
}

/**
 * A stable stand-in for an identifier that also exists in D1, so analytics rows can
 * still be grouped by it but not joined back to an account. "" without a secret, so
 * the raw identifier is never written.
 */
export async function anonymizeId(id: string, secret: string | undefined): Promise<string> {
  if (!id || !secret) {
    return "";
  }
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(id));
  return Array.from(new Uint8Array(signature).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
