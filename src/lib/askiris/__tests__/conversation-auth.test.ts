import { afterEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const createAuth = vi.fn(() => ({ api: { getSession } }));

vi.mock("@/lib/auth", () => ({ createAuth }));

const { hasAskIrisSession } = await import("../conversation-auth");

afterEach(() => {
  vi.clearAllMocks();
});

describe("hasAskIrisSession", () => {
  it("answers false without touching auth when there is no session cookie", async () => {
    await expect(hasAskIrisSession(new Headers())).resolves.toBe(false);
    expect(createAuth).not.toHaveBeenCalled();
  });

  it("validates a session cookie against Better Auth", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    const headers = new Headers({ cookie: "better-auth.session_token=token.signature" });

    await expect(hasAskIrisSession(headers)).resolves.toBe(true);
    expect(getSession).toHaveBeenCalledWith({ headers });
  });

  it("treats a stale session cookie as signed out", async () => {
    getSession.mockResolvedValue(null);
    const headers = new Headers({ cookie: "better-auth.session_token=expired.signature" });

    await expect(hasAskIrisSession(headers)).resolves.toBe(false);
  });

  it("renders as signed out when the session lookup fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getSession.mockRejectedValue(new Error("D1 unavailable"));
    const headers = new Headers({ cookie: "better-auth.session_token=token.signature" });

    await expect(hasAskIrisSession(headers)).resolves.toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
