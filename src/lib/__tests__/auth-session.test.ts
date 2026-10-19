import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  createAuth: () => ({ api: { getSession } }),
}));

const { getAccountUserId, getSessionUserId, hasAccountSession } = await import("../auth-session");

const request = new Request("http://localhost/api/me/gear");

beforeEach(() => {
  getSession.mockReset();
});

describe("getSessionUserId", () => {
  it("returns the id of a guest session too", async () => {
    getSession.mockResolvedValue({ user: { id: "guest", isAnonymous: true } });

    await expect(getSessionUserId(request)).resolves.toBe("guest");
  });
});

describe("getAccountUserId", () => {
  it("returns the id of a signed-in account", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", isAnonymous: false } });

    await expect(getAccountUserId(request)).resolves.toBe("u1");
  });

  it("treats a guest session as signed out", async () => {
    getSession.mockResolvedValue({ user: { id: "guest", isAnonymous: true } });

    await expect(getAccountUserId(request)).resolves.toBeUndefined();
  });

  it("returns undefined without a session", async () => {
    getSession.mockResolvedValue(null);

    await expect(getAccountUserId(request)).resolves.toBeUndefined();
  });
});

describe("hasAccountSession", () => {
  it("is true for an account and false for a guest or no session", async () => {
    getSession.mockResolvedValueOnce({ user: { id: "u1", isAnonymous: false } });
    getSession.mockResolvedValueOnce({ user: { id: "guest", isAnonymous: true } });
    getSession.mockResolvedValueOnce(null);

    await expect(hasAccountSession(request)).resolves.toBe(true);
    await expect(hasAccountSession(request)).resolves.toBe(false);
    await expect(hasAccountSession(request)).resolves.toBe(false);
  });

  it("never extends the session", async () => {
    getSession.mockResolvedValue(null);

    await hasAccountSession(request);

    expect(getSession).toHaveBeenCalledWith(expect.objectContaining({ query: { disableRefresh: true } }));
  });
});
