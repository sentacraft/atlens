// @vitest-environment jsdom
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import AskIrisChat from "../AskIrisChat";

vi.mock("next-intl", () => {
  const t = Object.assign((key: string) => key, { raw: () => [], rich: (key: string) => key });
  return { useTranslations: () => t, useLocale: () => "en" };
});
vi.mock("@/i18n/navigation", () => ({ Link: (props: object) => <a {...props} /> }));
vi.mock("@/components/iris/Iris", () => ({ default: () => <div data-testid="iris" /> }));
vi.mock("@/components/askiris/useStarters", () => ({ useStarters: () => [{ text: "Starter question", pool: "need" }] }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/context/TestHookProvider", () => ({ useTestHookOption: () => undefined }));
vi.mock("@/context/IrisPanelProvider", () => ({ useIris: () => ({ openIris: vi.fn(), closeIris: vi.fn(), irisShown: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const signedIn = {
  user: {
    id: "user-1",
    email: "iris@example.test",
    name: "Iris",
    emailVerified: true,
    isAnonymous: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  session: {
    id: "session-1",
    userId: "user-1",
    token: "token",
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
};

// One client for the server render and hydration, as the app's QueryProvider would.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Chat() {
  return (
    <QueryClientProvider client={queryClient}>
      <AskIrisChat shell={{ variant: "page", entry: {}, starterSeed: 1 }} linkTargets={{ lenses: {}, collections: [] }} lenses={[]} />
    </QueryClientProvider>
  );
}

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/get-session")
        ? Response.json(signedIn)
        : Response.json({ conversations: [] }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function historyButton(container: HTMLElement) {
  return [...container.querySelectorAll("button")].find((button) => button.textContent === "history") ?? null;
}

describe("AskIrisChat hydration", () => {
  // Streaming hydration can reach this page after Nav's NavMenu has already
  // resolved Better Auth's shared session store. Uses the real auth client, whose
  // React binding must hydrate with the pending session (better-auth#11316, >= 1.7.6).
  it("hydrates cleanly when the session resolves before the page hydrates", async () => {
    stubFetch();
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Chat />);
    document.body.appendChild(container);
    expect(historyButton(container)).toBeNull();

    authClient.hydrateSession(signedIn);
    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <Chat />, {
        onRecoverableError,
      });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(historyButton(container)).not.toBeNull();
  });

  it("shows the history entry to a guest, whose conversations are stored too", async () => {
    stubFetch();
    authClient.hydrateSession({ ...signedIn, user: { ...signedIn.user, isAnonymous: true } });
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container).render(<Chat />);
    });

    expect(historyButton(container)).not.toBeNull();
  });
});
