import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { signInCompleteProps } = await import("../sign-in-event");

const AT = new Date("2026-10-20T10:00:00Z");
const later = (ms: number) => new Date(AT.getTime() + ms);

describe("signInCompleteProps", () => {
  it("names the method from the auth route", () => {
    const user = { createdAt: AT };
    expect(signInCompleteProps({ path: "/callback/:id", user, sessionCreatedAt: later(1) })?.method).toBe("google");
    expect(signInCompleteProps({ path: "/sign-in/email-otp", user, sessionCreatedAt: later(1) })?.method).toBe("email");
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
