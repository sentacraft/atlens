// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MountPreferenceProvider, useMountPreference } from "../MountPreferenceProvider";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown },
  params: {} as { mount?: string },
}));

vi.mock("next/navigation", () => ({ useParams: () => mocks.params }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));

const fetchMock = vi.fn();

function Preference() {
  return <p data-testid="mount">{useMountPreference().preference}</p>;
}

function renderProvider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MountPreferenceProvider>
        <Preference />
      </MountPreferenceProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ settings: { defaultMount: "G", locale: null } })),
  );
  mocks.params = {};
  mocks.session = { data: { user: { id: "u1", isAnonymous: false } } };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("MountPreferenceProvider", () => {
  it("starts from the account's saved mount on a page whose URL names none", async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("mount")).toHaveTextContent("G"));
  });

  it("lets the URL's mount win over the saved one", async () => {
    mocks.params = { mount: "x" };

    renderProvider();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId("mount")).toHaveTextContent("X");
  });

  it("defaults to X for a guest without asking for settings", () => {
    mocks.session = { data: { user: { id: "g1", isAnonymous: true } } };

    renderProvider();

    expect(screen.getByTestId("mount")).toHaveTextContent("X");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
