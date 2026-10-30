import { beforeEach, describe, expect, it, vi } from "vitest";
import { hydrate, QueryClient } from "@tanstack/react-query";
import { loadProfile } from "../profile-data";
import { userGearQuery } from "../gear-client";
import { userFavoritesQuery } from "../favorites-client";
import { userSettingsQuery } from "../settings-client";
import { linkedProvidersQuery } from "../account-client";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  session: null as unknown,
  getSession: vi.fn(),
  listUserAccounts: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.getSession, listUserAccounts: mocks.listUserAccounts } }),
}));
vi.mock("@/lib/me/gear-repository", () => ({
  listUserGear: async () => [{ id: "g1", kind: "body", catalogId: "fujifilm-x-t5", name: "X-T5", brand: "fujifilm", mount: "X", createdAt: 1 }],
}));
vi.mock("@/lib/me/favorites-repository", () => ({
  listUserFavorites: async () => [{ lensId: "xf-33", createdAt: 2 }, { lensId: "xf-23", createdAt: 1 }],
}));
vi.mock("@/lib/me/settings-repository", () => ({
  getUserSettings: async () => ({ defaultMount: "X", locale: "en" }),
}));

const db = {} as D1Database;
const headers = new Headers({ cookie: "session=1" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockImplementation(async () => mocks.session);
  mocks.listUserAccounts.mockResolvedValue([{ providerId: "email-otp" }, { providerId: "github" }]);
});

describe("loadProfile", () => {
  it("returns nothing for a visitor without a session", async () => {
    mocks.session = null;

    expect(await loadProfile(headers, db)).toBeNull();
  });

  it("returns nothing for a guest session", async () => {
    mocks.session = { user: { id: "anon", name: "", email: "a@x", isAnonymous: true } };

    expect(await loadProfile(headers, db)).toBeNull();
  });

  // The client queries must find this data under their own keys, in the shape their fetchers return.
  it("prefills the profile's queries under the keys the client reads", async () => {
    mocks.session = { user: { id: "u1", name: "Iris", email: "iris@example.test", image: null, isAnonymous: false } };

    const profile = await loadProfile(headers, db);
    const client = new QueryClient();
    hydrate(client, profile!.state);

    expect(profile!.user).toEqual({ id: "u1", name: "Iris", email: "iris@example.test", image: null });
    expect(client.getQueryData(userGearQuery("u1").queryKey)).toEqual([expect.objectContaining({ id: "g1", name: "X-T5" })]);
    expect(client.getQueryData(userFavoritesQuery("u1").queryKey)).toEqual(["xf-33", "xf-23"]);
    expect(client.getQueryData(userSettingsQuery("u1").queryKey)).toEqual({ defaultMount: "X", locale: "en" });
    expect(client.getQueryData(linkedProvidersQuery("u1").queryKey)).toEqual(["email-otp", "github"]);
    expect(mocks.listUserAccounts).toHaveBeenCalledWith({ headers });
  });
});
