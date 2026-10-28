import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createSqliteD1 } from "./support/sqlite-d1";

const send = vi.fn();
const appDb = vi.hoisted(() => ({ current: undefined as unknown }));
const analyticsDb = vi.hoisted(() => ({ current: undefined as unknown }));
const waitUntil = vi.hoisted(() => vi.fn());
const betterAuth = vi.fn((config: unknown) => config);

vi.mock("better-auth", () => ({ betterAuth }));
const emailOTP = vi.fn((options: unknown) => options);
const oAuthProxy = vi.fn((options: unknown) => options);
const captcha = vi.fn((options: unknown) => options);
vi.mock("better-auth/plugins", () => ({
  anonymous: vi.fn(() => ({})),
  captcha,
  emailOTP,
  oAuthProxy,
  oneTap: vi.fn(() => ({})),
}));
vi.mock("better-auth/next-js", () => ({ nextCookies: vi.fn(() => ({})) }));
vi.mock("kysely-d1", () => ({ D1Dialect: vi.fn() }));
// `next dev` exposes only Wrangler bindings here; `.env.local` values reach process.env.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: { APP_DB: appDb.current, ANALYTICS_DB: analyticsDb.current, EMAIL: { send } },
    ctx: { waitUntil },
  }),
}));

const { createAuth } = await import("../auth");

type AuthConfig = {
  secret: string;
  baseURL: { fallback?: string };
  socialProviders: Partial<Record<"google" | "github", { clientId: string; clientSecret: string }>>;
};

describe("createAuth", () => {
  let sqlite: DatabaseSync;

  beforeEach(() => {
    const db = createSqliteD1("migrations/app");
    appDb.current = db.d1;
    sqlite = db.sqlite;
    send.mockReset();
    waitUntil.mockReset();
    vi.stubEnv("BETTER_AUTH_SECRET", "local-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GITHUB_CLIENT_ID", "github-id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "github-secret");
    vi.stubEnv("SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads application config from process.env", () => {
    const config = createAuth() as unknown as AuthConfig;

    expect(config.secret).toBe("local-secret");
    expect(config.baseURL.fallback).toBe("http://localhost:3000");
    expect(config.socialProviders).toEqual({
      google: { clientId: "client-id", clientSecret: "client-secret" },
      github: { clientId: "github-id", clientSecret: "github-secret" },
    });
  });

  it("omits a social sign-in whose credentials are missing", () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "");

    const config = createAuth() as unknown as AuthConfig;

    expect(config.socialProviders).toEqual({});
  });

  it.each([
    ["localhost:3000", "http://localhost:3000/api/auth"],
    ["localhost:8787", "http://localhost:8787/api/auth"],
    ["127.0.0.1:8787", "http://127.0.0.1:8787/api/auth"],
    ["atlens.app", "https://atlens.app/api/auth"],
    ["fix-x.preview.atlens.app", "https://fix-x.preview.atlens.app/api/auth"],
    ["evil.example", "http://localhost:3000/api/auth"],
    ["fix-x.preview.atlens.app.evil.example", "http://localhost:3000/api/auth"],
  ])("resolves the auth base URL for host %s", async (host, expected) => {
    const { resolveDynamicBaseURL } =
      await vi.importActual<typeof import("better-auth")>("better-auth");
    const config = createAuth() as unknown as {
      baseURL: Parameters<typeof resolveDynamicBaseURL>[0];
    };

    expect(resolveDynamicBaseURL(config.baseURL, new Headers({ host }), "/api/auth")).toBe(
      expected,
    );
  });

  it("signs other hosts in to Google through the production callback", () => {
    vi.stubEnv("SITE_URL", "https://atlens.app");
    vi.stubEnv("OAUTH_PROXY_SECRET", "proxy-secret");
    createAuth();

    expect(oAuthProxy).toHaveBeenLastCalledWith({
      productionURL: "https://atlens.app",
      secret: "proxy-secret",
    });
  });

  type SendOtp = (data: { email: string; otp: string }, ctx: { headers: Headers }) => Promise<void>;
  type SendDelete = (
    data: { user: { id: string; email: string }; url: string },
    request: Request,
  ) => Promise<void>;
  const zh = new Headers({ "x-atlens-locale": "zh" });

  async function sendBoth(user: { id: string; email: string }) {
    const config = createAuth() as unknown as {
      user: { deleteUser: { sendDeleteAccountVerification: SendDelete } };
    };
    const otpOptions = emailOTP.mock.lastCall![0] as { sendVerificationOTP: SendOtp };
    await otpOptions.sendVerificationOTP({ email: user.email, otp: "123456" }, { headers: zh });
    await config.user.deleteUser.sendDeleteAccountVerification(
      { user, url: "https://atlens.app/x" },
      new Request("https://atlens.app/api/auth/delete-user", { headers: zh }),
    );
    return send.mock.calls.map(([message]) => (message as { subject: string }).subject);
  }

  // Regression: every auth email went out in English.
  it("sends auth emails in the locale of the page that asked", async () => {
    await expect(sendBoth({ id: "nobody", email: "a@example.test" })).resolves.toEqual([
      "你的 Atlens 登录验证码",
      "确认删除你的 Atlens 账号",
    ]);
  });

  it("prefers the language the account saved over the page's", async () => {
    sqlite.exec(
      "INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES ('u1', 'u1', 'A@Example.test', 0, 0);" +
        "INSERT INTO user_settings (user_id, locale, updated_at) VALUES ('u1', 'en', 0);",
    );

    await expect(sendBoth({ id: "u1", email: "a@example.test" })).resolves.toEqual([
      "Your Atlens sign-in code",
      "Confirm deleting your Atlens account",
    ]);
  });

  type SessionHook = (
    session: { userId: string; createdAt: Date },
    ctx: { path: string; headers: Headers; context: { internalAdapter: { findUserById: (id: string) => Promise<unknown> } } },
  ) => Promise<void>;

  it("records a completed sign-in against the visitor's cookie, skipping guests", async () => {
    const analytics = createSqliteD1("migrations/analytics");
    analyticsDb.current = analytics.d1;
    const config = createAuth() as unknown as { databaseHooks: { session: { create: { after: SessionHook } } } };
    const createdAt = new Date("2026-10-20T10:00:00Z");
    const users: Record<string, unknown> = {
      account: { id: "account", createdAt, isAnonymous: false },
      guest: { id: "guest", createdAt, isAnonymous: true },
    };
    const vid = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const ctx = {
      path: "/sign-in/email-otp",
      headers: new Headers({ cookie: `atlens_vid=${vid}; atlens_internal=1` }),
      context: { internalAdapter: { findUserById: async (id: string) => users[id] } },
    };

    await config.databaseHooks.session.create.after({ userId: "account", createdAt }, ctx);
    await config.databaseHooks.session.create.after({ userId: "guest", createdAt }, ctx);
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    const rows = analytics.sqlite.prepare("SELECT event, vid, signed_in, internal, props FROM events").all();
    expect(rows).toEqual([
      {
        event: "sign_in_complete",
        vid,
        signed_in: 1,
        internal: 1,
        props: JSON.stringify({ method: "email", new_account: true }),
      },
    ]);
  });

  it("asks for a Turnstile token before emailing a sign-in code", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");

    createAuth();

    expect(captcha).toHaveBeenLastCalledWith({
      provider: "cloudflare-turnstile",
      secretKey: "turnstile-secret",
      endpoints: ["/email-otp/send-verification-otp"],
    });
  });

  it("refuses to start without a secret", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    expect(() => createAuth()).toThrow("BETTER_AUTH_SECRET is not configured");
  });
});
