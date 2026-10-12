import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const betterAuth = vi.fn((config: unknown) => config);

vi.mock("better-auth", () => ({ betterAuth }));
vi.mock("better-auth/plugins", () => ({ emailOTP: vi.fn(() => ({})) }));
vi.mock("better-auth/next-js", () => ({ nextCookies: vi.fn(() => ({})) }));
vi.mock("kysely-d1", () => ({ D1Dialect: vi.fn() }));
// `next dev` exposes only Wrangler bindings here; `.env.local` values reach process.env.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { APP_DB: {}, EMAIL: {} }, ctx: {} }),
}));

const { createAuth } = await import("../auth");

type AuthConfig = {
  secret: string;
  baseURL: { fallback?: string };
  socialProviders?: { google: { clientId: string; clientSecret: string } };
};

describe("createAuth", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "local-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads application config from process.env", () => {
    const config = createAuth() as unknown as AuthConfig;

    expect(config.secret).toBe("local-secret");
    expect(config.baseURL.fallback).toBe("http://localhost:3000");
    expect(config.socialProviders?.google).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  it("omits Google sign-in when its credentials are missing", () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    const config = createAuth() as unknown as AuthConfig;

    expect(config.socialProviders).toBeUndefined();
  });

  it.each([
    ["localhost:3000", "http://localhost:3000/api/auth"],
    ["localhost:8787", "http://localhost:8787/api/auth"],
    ["127.0.0.1:8787", "http://127.0.0.1:8787/api/auth"],
    ["atlens.app", "https://atlens.app/api/auth"],
    ["evil.example", "http://localhost:3000/api/auth"],
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

  it("refuses to start without a secret", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    expect(() => createAuth()).toThrow("BETTER_AUTH_SECRET is not configured");
  });
});
