import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { recordSignIn, signInCompleteProps } = await import("../sign-in-event");
const { cookieReader } = await import("../session");

const AT = new Date("2026-10-20T10:00:00Z");
const later = (ms: number) => new Date(AT.getTime() + ms);

describe("signInCompleteProps", () => {
  it("names the method from the auth route", () => {
    const user = { createdAt: AT };
    const method = (path: string, provider?: string) =>
      signInCompleteProps({ path, provider, user, sessionCreatedAt: later(1) })?.method;
    expect(method("/callback/:id", "google")).toBe("google");
    expect(method("/callback/:id", "github")).toBe("github");
    expect(method("/one-tap/callback")).toBe("one_tap");
    expect(method("/sign-in/email-otp")).toBe("email");
    expect(method("/callback/:id", "unknown")).toBeUndefined();
  });

  it("counts a user created with the session as a new account, an older one as returning", () => {
    const path = "/sign-in/email-otp";
    expect(signInCompleteProps({ path, user: { createdAt: AT }, sessionCreatedAt: later(300) })?.new_account).toBe(true);
    expect(signInCompleteProps({ path, user: { createdAt: AT }, sessionCreatedAt: later(86_400_000) })?.new_account).toBe(false);
  });

  it("skips guest sessions and sessions that are not a sign-in", () => {
    expect(signInCompleteProps({ path: "/sign-in/anonymous", user: { createdAt: AT, isAnonymous: true }, sessionCreatedAt: AT })).toBeNull();
    expect(signInCompleteProps({ path: "/sign-in/email-otp", user: { createdAt: AT, isAnonymous: true }, sessionCreatedAt: AT })).toBeNull();
    expect(signInCompleteProps({ path: "/update-user", user: { createdAt: AT }, sessionCreatedAt: AT })).toBeNull();
  });
});

describe("recordSignIn", () => {
  const session = { path: "/sign-in/email-otp", user: { createdAt: AT }, sessionCreatedAt: AT };

  function fakeDb() {
    const run = vi.fn(async () => ({}));
    const prepare = vi.fn(() => ({ bind: () => ({ run }) }));
    return { db: { prepare } as unknown as D1Database, prepare };
  }

  it("records a sign-in", async () => {
    const { db, prepare } = fakeDb();
    await recordSignIn(db, session, { cookies: cookieReader(null), raw: undefined });
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("records nothing for a device that opted out of usage statistics", async () => {
    const { db, prepare } = fakeDb();
    await recordSignIn(db, session, { cookies: cookieReader("atlens_no_stats=1"), raw: undefined });
    expect(prepare).not.toHaveBeenCalled();
  });
});
