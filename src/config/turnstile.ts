/** Public; the server checks tokens with the TURNSTILE_SECRET_KEY secret. */
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFpbg5qUYAzkYU77";

/**
 * Cloudflare's always-pass test key, for local hosts the real widget doesn't allow. Pair it with
 * the test secret 1x0000000000000000000000000000000AA in .env.local.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
