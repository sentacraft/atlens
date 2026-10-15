// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { TestHookProvider, useTestHookEnabled } from "../TestHookProvider";

const search = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/me",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => search.current,
}));

function Probe() {
  return <p data-testid="enabled">{String(useTestHookEnabled())}</p>;
}

function renderProvider() {
  return render(
    <StrictMode>
      <TestHookProvider>
        <Probe />
      </TestHookProvider>
    </StrictMode>,
  );
}

// The test environment's localStorage has no clear(), so each test gets a fresh in-memory one.
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
  search.current = new URLSearchParams();
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TestHookProvider", () => {
  // Regression: a remount without ?testhook=1 (e.g. switching language) turned the test hook
  // off, because the initial state was saved over the stored one before it was read back.
  it("keeps a saved test hook on across a remount without the URL param", async () => {
    localStorage.setItem("testhook-state", JSON.stringify({ testHook: true, options: {} }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("enabled")).toHaveTextContent("true"));
    expect(JSON.parse(localStorage.getItem("testhook-state")!)).toMatchObject({ testHook: true });
  });

  it("saves the state the URL turns on", async () => {
    search.current = new URLSearchParams("testhook=1");

    renderProvider();

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("testhook-state")!)).toMatchObject({ testHook: true }),
    );
  });
});
