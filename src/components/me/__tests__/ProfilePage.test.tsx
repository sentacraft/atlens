// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfilePage from "../ProfilePage";
import { InitialAccountProvider } from "@/context/InitialAccountProvider";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown, isPending: false },
  replace: vi.fn(),
  setPreference: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
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
vi.mock("@/app/[locale]/not-found", () => ({ default: () => <p>not-found</p> }));
vi.mock("@/components/auth/AuthDialog", () => ({ default: () => null }));
vi.mock("@/components/auth/DeleteAccountDialog", () => ({ default: () => null }));
vi.mock("@/components/me/GearSection", () => ({ default: () => null }));
vi.mock("@/components/me/FavoritesSection", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

const fetchMock = vi.fn();

function signedIn() {
  mocks.session = {
    data: { user: { ...IRIS, isAnonymous: false } },
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

const IRIS = { id: "u1", name: "Iris", email: "iris@example.test", image: null };

function renderPage(initialUser: typeof IRIS | null = (mocks.session.data as { user?: typeof IRIS } | null)?.user ?? null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InitialAccountProvider user={initialUser}>
        <ProfilePage lenses={[]} compareBar={<div data-testid="compare-bar" />} />
      </InitialAccountProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  mocks.session = { data: null, isPending: false };
  document.cookie = "atlens_locale=; Max-Age=0; Path=/";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ProfilePage", () => {
  it("asks a signed-out visitor to sign in, with no compare bar since nothing there can be compared", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "signInTitle" })).toBeInTheDocument();
    expect(screen.queryByTestId("compare-bar")).toBeNull();
  });

  it("shows the compare bar beside a signed-in visitor's favorites", () => {
    signedIn();
    serveSettings(settingsResponse({ defaultMount: "X", locale: null }));
    renderPage();

    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
  });

  // The page used to render an empty shell until the browser had fetched the session.
  it("renders the account the server found while the browser's session is still loading", () => {
    mocks.session = { data: null, isPending: true };
    serveSettings(settingsResponse({ defaultMount: "X", locale: null }));
    renderPage(IRIS);

    expect(screen.getByRole("heading", { name: "Iris" })).toBeInTheDocument();
    expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
  });

  it("asks a guest the server found to sign in without waiting for the browser's session", () => {
    mocks.session = { data: null, isPending: true };
    renderPage(null);

    expect(screen.getByRole("heading", { name: "signInTitle" })).toBeInTheDocument();
  });

  it("follows the browser's session once it loads, such as a sign-out in another tab", () => {
    renderPage(IRIS);

    expect(screen.getByRole("heading", { name: "signInTitle" })).toBeInTheDocument();
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
