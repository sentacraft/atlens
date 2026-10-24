// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RevisitPrompt from "../RevisitPrompt";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/context/SupportDialogProvider", () => ({ useSupportDialog: () => vi.fn() }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));

const auth = vi.hoisted(() => ({ account: undefined as { id: string } | undefined }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: auth.account ? { user: auth.account } : null, isPending: false }) },
  accountUser: () => auth.account,
}));

const settings = vi.hoisted(() => ({ done: false, patch: vi.fn() }));
vi.mock("@/lib/me/settings-client", () => ({
  userSettingsQuery: (userId: string) => ({
    queryKey: ["me", "settings", userId],
    queryFn: async () => ({ defaultMount: "X", locale: null, revisitPromptDone: settings.done }),
  }),
  patchUserSettings: settings.patch,
}));

const DAY = 86_400_000;

function memoryStorage(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

/** Two earlier visit days, so today's makes the third. */
function returningVisitor(extra: Record<string, string> = {}) {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return memoryStorage({ atlens_visit_days: JSON.stringify([midnight - 2 * DAY, midnight - DAY]), ...extra });
}

async function renderPrompt() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RevisitPrompt />
    </QueryClientProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  auth.account = undefined;
  settings.done = false;
  settings.patch.mockReset().mockResolvedValue({ defaultMount: "X", locale: null, revisitPromptDone: true });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RevisitPrompt", () => {
  it("shows a guest on their third visit day", async () => {
    vi.stubGlobal("localStorage", returningVisitor());
    await renderPrompt();
    expect(screen.getByRole("heading", { name: "revisitTitle" })).toBeInTheDocument();
  });

  it("stays hidden for an account that finished it on another device", async () => {
    const storage = returningVisitor();
    vi.stubGlobal("localStorage", storage);
    auth.account = { id: "u1" };
    settings.done = true;
    await renderPrompt();

    expect(screen.queryByRole("heading", { name: "revisitTitle" })).toBeNull();
    expect(storage.data.get("atlens_support_revisit_done")).toBe("1");
  });

  it("records on the account when a signed-in visitor closes it", async () => {
    vi.stubGlobal("localStorage", returningVisitor());
    auth.account = { id: "u1" };
    await renderPrompt();

    fireEvent.click(screen.getByRole("button", { name: "revisitLater" }));
    expect(settings.patch).toHaveBeenCalledWith({ revisitPromptDone: true });
  });

  it("carries a close from before sign-in over to the account", async () => {
    vi.stubGlobal("localStorage", returningVisitor({ atlens_support_revisit_done: "1" }));
    auth.account = { id: "u1" };
    await renderPrompt();

    expect(settings.patch).toHaveBeenCalledWith({ revisitPromptDone: true });
    expect(screen.queryByRole("heading", { name: "revisitTitle" })).toBeNull();
  });
});
