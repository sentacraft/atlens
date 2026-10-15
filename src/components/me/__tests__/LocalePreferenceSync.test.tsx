// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccountPreferencesSync from "../AccountPreferencesSync";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown, isPending: false },
  urlMount: null as string | null,
  setPreference: vi.fn(),
}));

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));
vi.mock("@/hooks/useMountParam", () => ({ useMountParam: () => mocks.urlMount }));
vi.mock("@/context/MountPreferenceProvider", () => ({
  useMountPreference: () => ({ setPreference: mocks.setPreference }),
}));

const fetchMock = vi.fn();

function renderSync() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountPreferencesSync />
    </QueryClientProvider>,
  );
}

function signedIn(isAnonymous = false) {
  mocks.session = { data: { user: { id: "u1", isAnonymous } }, isPending: false };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ settings: { defaultMount: "G", locale: "en" } })),
  );
  mocks.urlMount = null;
  document.cookie = "atlens_locale=; Max-Age=0; Path=/";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AccountPreferencesSync", () => {
  it("mirrors the saved language into the cookie and applies the default mount", async () => {
    signedIn();

    renderSync();

    await waitFor(() => expect(document.cookie).toContain("atlens_locale=en"));
    expect(mocks.setPreference).toHaveBeenCalledWith("G");
  });

  it("leaves the mount alone when the URL names one", async () => {
    signedIn();
    mocks.urlMount = "X";

    renderSync();

    await waitFor(() => expect(document.cookie).toContain("atlens_locale=en"));
    expect(mocks.setPreference).not.toHaveBeenCalled();
  });

  it("clears the cookie for a guest and never asks for settings", async () => {
    document.cookie = "atlens_locale=zh; Path=/";
    signedIn(true);

    renderSync();

    await waitFor(() => expect(document.cookie).not.toContain("atlens_locale"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
