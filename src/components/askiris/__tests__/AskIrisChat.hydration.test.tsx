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
vi.mock("@/context/TestHookProvider", () => ({ useTestHookOption: () => undefined }));

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("AskIrisChat hydration", () => {
  // Streaming hydration can reach this page after Nav's AuthControl has already
  // resolved the shared session store, so the first client render sees a user the
  // server render did not.
  it("renders the same markup when the session resolves before the page hydrates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ conversations: [] })),
    );
    session.current = { data: null, isPending: true };
    const container = document.createElement("div");
    container.innerHTML = renderToString(<AskIrisChat lensIndex={{}} />);
    document.body.appendChild(container);

    session.current = { data: { user: { id: "user-1" } }, isPending: false };
    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <AskIrisChat lensIndex={{}} />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('button[aria-label="openHistory"]')).not.toBeNull();
  });
});
