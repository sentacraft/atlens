import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteD1 } from "./support/sqlite-d1";

const appDb = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: { APP_DB: appDb.current, EMAIL: { send: vi.fn() } },
    ctx: { waitUntil: () => {} },
  }),
}));

const { createAuth } = await import("../auth");

const PRODUCTION = "https://atlens.app";
const PREVIEW = "https://fix-x.preview.atlens.app";

// Production and Worker Previews share only the proxy secret: each has its own auth secret,
// database and (on previews, a placeholder) Google client secret.
type Deployment = { db: D1Database; authSecret: string; googleClientSecret: string };
let production: Deployment;
let preview: Deployment;

function authFor(host: string) {
  const deployment = host === new URL(PRODUCTION).host ? production : preview;
  appDb.current = deployment.db;
  vi.stubEnv("BETTER_AUTH_SECRET", deployment.authSecret);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", deployment.googleClientSecret);
  return createAuth();
}

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

// Google's token endpoint; the provider reads the profile from the unverified ID token.
async function googleToken() {
  const idToken = [
    base64url({ alg: "none" }),
    base64url({ sub: "google-1", email: "p@example.test", email_verified: true, name: "P" }),
    "signature",
  ].join(".");
  return Response.json({ access_token: "access", id_token: idToken, expires_in: 3600 });
}

function request(url: string, init: RequestInit = {}) {
  const host = new URL(url).host;
  const headers = new Headers(init.headers);
  headers.set("host", host);
  return authFor(host).handler(new Request(url, { ...init, headers }));
}

function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function startGoogleSignIn(origin: string) {
  const response = await request(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ provider: "google", callbackURL: `${origin}/zh/me` }),
  });
  const { url } = (await response.json()) as { url: string };
  return { response, google: new URL(url) };
}

function googleCallback(google: URL) {
  return request(
    `${PRODUCTION}/api/auth/callback/google?code=code&state=${encodeURIComponent(google.searchParams.get("state")!)}`,
  );
}

describe("Google sign-in on a preview", () => {
  beforeEach(() => {
    production = {
      db: createSqliteD1("migrations/app").d1,
      authSecret: "production-auth-secret-production-auth-secret",
      googleClientSecret: "client-secret",
    };
    preview = {
      db: createSqliteD1("migrations/app").d1,
      authSecret: "preview-auth-secret-preview-auth-secret-xx",
      googleClientSecret: "unused-on-previews",
    };
    vi.stubEnv("OAUTH_PROXY_SECRET", "proxy-secret-shared-by-production-and-previews");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("SITE_URL", PRODUCTION);
    vi.stubGlobal("fetch", vi.fn(googleToken));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("goes through the production callback and signs in on the preview", async () => {
    const start = await startGoogleSignIn(PREVIEW);
    expect(start.google.searchParams.get("redirect_uri")).toBe(
      `${PRODUCTION}/api/auth/callback/google`,
    );

    const callback = await googleCallback(start.google);
    const handoff = callback.headers.get("location")!;
    expect(handoff.startsWith(`${PREVIEW}/api/auth/callback/google/oauth-proxy?`)).toBe(true);
    expect(cookies(callback)).not.toContain("session_token");

    const completion = await request(handoff, { headers: { cookie: cookies(start.response) } });
    expect(completion.headers.get("location")).toBe(`${PREVIEW}/zh/me`);
    const session = await authFor(new URL(PREVIEW).host).api.getSession({
      headers: new Headers({ host: new URL(PREVIEW).host, cookie: cookies(completion) }),
    });
    expect(session?.user.email).toBe("p@example.test");
  });

  it("never hands the profile to a host outside atlens.app", async () => {
    const start = await startGoogleSignIn("https://fix-x.preview.atlens.app.evil.example");
    const callback = await googleCallback(start.google);

    expect(new URL(callback.headers.get("location")!).origin).toBe(PRODUCTION);
  });

  it("leaves sign-in on production direct", async () => {
    const { google } = await startGoogleSignIn(PRODUCTION);
    expect(google.searchParams.get("redirect_uri")).toBe(`${PRODUCTION}/api/auth/callback/google`);
    expect(google.searchParams.get("state")).toHaveLength(32);
  });
});
