// @vitest-environment jsdom
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import AskIrisChat from "../AskIrisChat";

vi.mock("next-intl", () => {
  const t = Object.assign((key: string) => key, { raw: () => [], rich: (key: string) => key });
  return { useTranslations: () => t, useLocale: () => "en" };
});
vi.mock("@/i18n/navigation", () => ({ Link: (props: object) => <a {...props} /> }));
vi.mock("@/components/iris/Iris", () => ({ default: () => <div data-testid="iris" /> }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
const testHook = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/context/TestHookProvider", () => ({
  useTestHookEnabled: () => testHook.enabled,
  useTestHookOption: () => undefined,
}));

const signedIn = {
  user: {
    id: "user-1",
    email: "iris@example.test",
    name: "Iris",
    emailVerified: true,
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
  testHook.enabled = true;
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("AskIrisChat hydration", () => {
  // Streaming hydration can reach this page after Nav's AuthControl has already
  // resolved Better Auth's shared session store. Uses the real auth client, whose
  // React binding must hydrate with the pending session (better-auth#11316, >= 1.7.6).
  it("hydrates cleanly when the session resolves before the page hydrates", async () => {
    stubFetch();
    const container = document.createElement("div");
    container.innerHTML = renderToString(<AskIrisChat entry={{ kind: "new" }} lensIndex={{}} />);
    document.body.appendChild(container);
    expect(container.querySelector('button[aria-label="openHistory"]')).toBeNull();

    authClient.hydrateSession(signedIn);
    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <AskIrisChat entry={{ kind: "new" }} lensIndex={{}} />, {
        onRecoverableError,
      });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('button[aria-label="openHistory"]')).not.toBeNull();
  });

  it("keeps the history entry behind test hooks", async () => {
    testHook.enabled = false;
    stubFetch();
    authClient.hydrateSession(signedIn);
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container).render(<AskIrisChat entry={{ kind: "new" }} lensIndex={{}} />);
    });

    expect(container.querySelector('button[aria-label="openHistory"]')).toBeNull();
  });
});
