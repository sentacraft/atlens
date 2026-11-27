// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { clearLocalFavorites, getLocalFavoritesSnapshot } from "@/lib/me/local-favorites";
import { MAX_FAVORITES } from "@/lib/me/favorites-schema";
import { useFavorites } from "../useFavorites";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown },
  push: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));

let serverFavorites: string[];
let failNextPost: boolean;

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
  serverFavorites = ["xf-56"];
  failNextPost = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!init?.method) {
        return Response.json({ favorites: serverFavorites.map((lensId) => ({ lensId, createdAt: 1 })) });
      }
      if (init.method === "POST") {
        if (failNextPost) {
          return Response.json({ error: "favorites_limit_reached" }, { status: 409 });
        }
        serverFavorites = [JSON.parse(init.body as string).lensId, ...serverFavorites];
      }
      return new Response(null, { status: 204 });
    }),
  );
});

afterEach(() => {
  cleanup();
  clearLocalFavorites();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const account = { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous: false } };

describe("useFavorites", () => {
  it("saves, removes, and undoes guest favorites in localStorage without hitting the server", () => {
    mocks.session = { data: { user: { ...account.user, isAnonymous: true } } };
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => result.current.toggle("xf-23"));
    expect(result.current.isFavorite("xf-23")).toBe(true);
    expect(result.current.lensIds).toEqual(["xf-23"]);
    expect(getLocalFavoritesSnapshot()).toEqual(["xf-23"]);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith("favoriteAddedLocal", expect.objectContaining({ action: expect.anything() }));

    act(() => result.current.toggle("xf-23"));
    expect(result.current.isFavorite("xf-23")).toBe(false);
    const removedCall = mocks.toast.mock.calls.at(-1);
    expect(removedCall?.[0]).toBe("favoriteRemoved");
    act(() => removedCall?.[1].action.onClick());
    expect(result.current.isFavorite("xf-23")).toBe(true);
  });

  it("shows favoritesLimit when a guest reaches the 500 cap", () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, index) => `lens-${index}`);
    localStorage.setItem("atlens_local_favorites", JSON.stringify(full));
    mocks.session = { data: null };
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => result.current.toggle("extra"));

    expect(mocks.toast.error).toHaveBeenCalledWith("favoritesLimit", expect.objectContaining({ action: expect.anything() }));
    expect(result.current.isFavorite("extra")).toBe(false);
  });

  it("shows a new favorite first before the server confirms it", async () => {
    mocks.session = { data: account };
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.lensIds).toEqual(["xf-56"]));

    act(() => result.current.toggle("xf-23"));

    await waitFor(() => expect(result.current.isFavorite("xf-23")).toBe(true));
    expect(result.current.lensIds[0]).toBe("xf-23");
    expect(mocks.toast).toHaveBeenCalledWith("favoriteAdded", expect.objectContaining({ action: expect.anything() }));
  });

  it("rolls back and explains when the favorites limit is reached", async () => {
    mocks.session = { data: account };
    failNextPost = true;
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.lensIds).toEqual(["xf-56"]));

    act(() => result.current.toggle("xf-23"));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("favoritesLimit", expect.objectContaining({ action: expect.anything() })));
    await waitFor(() => expect(result.current.isFavorite("xf-23")).toBe(false));
  });
});
