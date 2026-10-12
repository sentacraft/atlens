// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AskIrisChat from "../AskIrisChat";

const session = vi.hoisted(() => ({ current: { data: null as unknown, isPending: true } }));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => session.current },
}));
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

afterEach(() => {
  testHook.enabled = true;
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("AskIrisChat hydration", () => {
  // Streaming hydration can reach this page after Nav's AuthControl has already
  // resolved the shared session store, so the client may know the session before
  // this subtree hydrates. The server-read sign-in state keeps both renders equal.
  it.each([
    { label: "signed in", user: { id: "user-1" } },
    { label: "signed out", user: null },
  ])("matches the server render when $label and the session resolves first", async ({ user }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ conversations: [] })));
    const signedIn = user !== null;
    session.current = { data: null, isPending: true };
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <AskIrisChat lensIndex={{}} initialAuthenticated={signedIn} />,
    );
    document.body.appendChild(container);
    const historyInServerHtml = container.querySelector('button[aria-label="openHistory"]') !== null;

    session.current = { data: user ? { user } : null, isPending: false };
    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <AskIrisChat lensIndex={{}} initialAuthenticated={signedIn} />, {
        onRecoverableError,
      });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(historyInServerHtml).toBe(signedIn);
  });

  it("keeps the history entry behind test hooks", () => {
    testHook.enabled = false;
    session.current = { data: { user: { id: "user-1" } }, isPending: false };

    const html = renderToString(<AskIrisChat lensIndex={{}} initialAuthenticated />);

    expect(html).not.toContain('aria-label="openHistory"');
  });
});
