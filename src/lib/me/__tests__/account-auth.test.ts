import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  createAuth: () => ({ api: { getSession } }),
}));

const { getAccountUserId } = await import("../account-auth");

const request = new Request("http://localhost/api/me/gear");

beforeEach(() => {
  getSession.mockReset();
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
