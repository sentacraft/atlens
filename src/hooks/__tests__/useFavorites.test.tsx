// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFavorites } from "../useFavorites";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown },
  openSignIn: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));

let serverFavorites: string[];
let failNextPost: boolean;

beforeEach(() => {
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
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const account = { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous: false } };

describe("useFavorites", () => {
  it("asks a guest to sign in instead of saving", () => {
    mocks.session = { data: { user: { ...account.user, isAnonymous: true } } };
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => result.current.toggle("xf-23"));

    expect(mocks.openSignIn).toHaveBeenCalledWith("favorite");
    expect(fetch).not.toHaveBeenCalled();
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

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("favoritesLimit"));
    await waitFor(() => expect(result.current.isFavorite("xf-23")).toBe(false));
  });
});
