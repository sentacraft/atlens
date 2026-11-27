// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { addLocalFavorite, clearLocalFavorites, getLocalFavoritesSnapshot } from "@/lib/me/local-favorites";
import LocalFavoritesSync from "../LocalFavoritesSync";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown, isPending: false },
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));

function renderSync() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <LocalFavoritesSync />
    </QueryClientProvider>,
  );
  return { invalidateQueries };
}

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  clearLocalFavorites();
  mocks.session = { data: { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous: false } }, isPending: false };
});

afterEach(() => {
  cleanup();
  clearLocalFavorites();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("LocalFavoritesSync", () => {
  it("merges local favorites into the signed-in account, clears storage, and notifies", async () => {
    addLocalFavorite("xf-56");
    addLocalFavorite("xf-23");
    const fetchMock = vi.fn(async () => Response.json({ added: 2, skippedLimit: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const { invalidateQueries } = renderSync();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/me/favorites/merge",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ lensIds: ["xf-23", "xf-56"] }),
        }),
      ),
    );
    await waitFor(() => expect(getLocalFavoritesSnapshot()).toEqual([]));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["me", "favorites", "u1"] });
    expect(mocks.toast).toHaveBeenCalledWith('favoritesSynced {"count":2}', { id: "favorites-synced" });
  });

  it("stays silent when merged favorites already existed in the account", async () => {
    addLocalFavorite("xf-56");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ added: 0, skippedLimit: 0 })));

    renderSync();

    await waitFor(() => expect(getLocalFavoritesSnapshot()).toEqual([]));
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("keeps local favorites intact if merging fails", async () => {
    addLocalFavorite("xf-56");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    renderSync();

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(getLocalFavoritesSnapshot()).toEqual(["xf-56"]);
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
