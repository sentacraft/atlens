// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LocalePreferenceSync from "../LocalePreferenceSync";

const session = vi.hoisted(() => ({ current: { data: null as unknown, isPending: false } }));

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => session.current },
}));

const fetchMock = vi.fn();

function renderSync() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LocalePreferenceSync />
    </QueryClientProvider>,
  );
}

function signedIn(isAnonymous = false) {
  session.current = { data: { user: { id: "u1", isAnonymous } }, isPending: false };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ settings: { defaultMount: "G", locale: "en" } })),
  );
  document.cookie = "atlens_locale=; Max-Age=0; Path=/";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("LocalePreferenceSync", () => {
  it("mirrors the saved language into the cookie", async () => {
    signedIn();

    renderSync();

    await waitFor(() => expect(document.cookie).toContain("atlens_locale=en"));
  });

  it("clears the cookie for a guest and never asks for settings", async () => {
    document.cookie = "atlens_locale=zh; Path=/";
    signedIn(true);

    renderSync();

    await waitFor(() => expect(document.cookie).not.toContain("atlens_locale"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
