// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { addLocalFavorite, clearLocalFavorites } from "@/lib/me/local-favorites";
import ProfilePage from "../ProfilePage";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown, isPending: false },
  replace: vi.fn(),
  setPreference: vi.fn(),
  openSignIn: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () =>
    Object.assign(
      (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
      { rich: (key: string) => key },
    ),
  useLocale: () => "zh",
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/me",
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: {
    useSession: () => mocks.session,
    listAccounts: async () => ({ data: [{ providerId: "google" }], error: null }),
  },
}));
vi.mock("@/context/MountPreferenceProvider", () => ({
  useMountPreference: () => ({ setPreference: mocks.setPreference }),
}));
vi.mock("@/context/NavProvider", () => ({ useNav: () => ({ navHidden: false }) }));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));
vi.mock("@/app/[locale]/not-found", () => ({ default: () => <p>not-found</p> }));
vi.mock("@/components/auth/AuthDialog", () => ({ default: () => null }));
vi.mock("@/components/auth/DeleteAccountDialog", () => ({ default: () => null }));
vi.mock("@/components/me/GearSection", () => ({ default: () => null }));
vi.mock("@/components/me/FavoritesSection", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

const fetchMock = vi.fn();

function signedIn() {
  mocks.session = {
    data: { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous: false, image: null } },
    isPending: false,
  };
}

function settingsResponse(settings: unknown, status = 200) {
  return new Response(JSON.stringify({ settings }), { status });
}

function serveSettings(...responses: Response[]) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/me/gear") {
      return Response.json({ gear: [] });
    }
    if (url === "/api/me/favorites") {
      return Response.json({ favorites: [] });
    }
    return responses.shift() ?? new Response(null, { status: 500 });
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfilePage lenses={[]} compareBar={<div data-testid="compare-bar" />} />
    </QueryClientProvider>,
  );
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
  vi.stubGlobal("fetch", fetchMock);
  mocks.session = { data: null, isPending: false };
  document.cookie = "atlens_locale=; Max-Age=0; Path=/";
});

afterEach(() => {
  cleanup();
  clearLocalFavorites();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ProfilePage", () => {
  it("asks a signed-out visitor with no local favorites to sign in, with no compare bar", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "signInTitle" })).toBeInTheDocument();
    expect(screen.queryByTestId("compare-bar")).toBeNull();
  });

  it("shows local favorites with the anti-loss prompt and compare bar for a guest who has saved lenses", () => {
    addLocalFavorite("xf-56");
    addLocalFavorite("xf-23");
    renderPage();

    expect(screen.getByRole("heading", { name: "favoritesTitle" })).toBeInTheDocument();
    expect(screen.getByText('localFavoritesCount {"count":2}')).toBeInTheDocument();
    expect(screen.getByText("localFavoritesNotice")).toBeInTheDocument();
    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "signInToSave" }));
    expect(mocks.openSignIn).toHaveBeenCalledWith("favorite");
  });

  it("shows the compare bar beside a signed-in visitor's favorites", () => {
    signedIn();
    serveSettings(settingsResponse({ defaultMount: "X", locale: null }));
    renderPage();

    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
  });

  it("saves a new language, remembers it for the bare root, and moves to that language", async () => {
    signedIn();
    serveSettings(
      settingsResponse({ defaultMount: "X", locale: null }),
      settingsResponse({ defaultMount: "X", locale: "en" }),
    );

    renderPage();
    const english = await screen.findByRole("radio", { name: "English" });
    await waitFor(() => expect(english).toBeEnabled());
    expect(screen.getByRole("radio", { name: "中文" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(english);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/me", { locale: "en" }));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/me/settings", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ locale: "en" }),
    }));
    expect(document.cookie).toContain("atlens_locale=en");
  });

  it("applies a new default mount at once and rolls it back when saving fails", async () => {
    signedIn();
    serveSettings(
      settingsResponse({ defaultMount: "X", locale: "zh" }),
      new Response(null, { status: 500 }),
    );

    renderPage();
    const g = await screen.findByRole("radio", { name: "gfx" });
    await waitFor(() => expect(g).toBeEnabled());
    fireEvent.click(g);

    expect(mocks.setPreference).toHaveBeenCalledWith("G");
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("saveError"));
    expect(screen.getByRole("radio", { name: "x" })).toHaveAttribute("aria-checked", "true");
    expect(mocks.setPreference).toHaveBeenLastCalledWith("X");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
