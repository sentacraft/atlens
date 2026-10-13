// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureSession } from "@/lib/auth-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AskIrisChat from "../AskIrisChat";

vi.mock("next-intl", () => {
  const t = Object.assign((key: string) => key, { raw: () => [], rich: (key: string) => key });
  return { useTranslations: () => t, useLocale: () => "en" };
});
vi.mock("@/i18n/navigation", () => ({ Link: (props: object) => <a {...props} /> }));
vi.mock("@/components/iris/Iris", () => ({ default: () => <div data-testid="iris" /> }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/context/TestHookProvider", () => ({
  useTestHookEnabled: () => false,
  useTestHookOption: () => undefined,
}));

const auth = vi.hoisted(() => ({ order: [] as string[] }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
  accountUser: () => undefined,
  ensureSession: vi.fn(async () => {
    auth.order.push("ensureSession");
    return true;
  }),
}));

const emptyStream = () =>
  new Response('data: {"type":"start"}\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n', {
    headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
  });

beforeEach(() => {
  auth.order = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollTo = () => {};
});

function renderChat() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AskIrisChat entry={{ kind: "new" }} lensIndex={{}} />
    </QueryClientProvider>,
  );
}

function submit(container: HTMLElement, text: string) {
  const input = container.querySelector("form input")!;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest("form")!);
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("AskIrisChat send", () => {
  it("signs a visitor in anonymously, then sends only the new message", async () => {
    let chatBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("/api/chat")) {
          auth.order.push("chat");
          chatBody = JSON.parse(String(init?.body));
          return emptyStream();
        }
        return Response.json({});
      }),
    );

    const { container } = renderChat();
    submit(container, "Which lens?");

    await waitFor(() => expect(chatBody).toBeDefined());
    expect(auth.order).toEqual(["ensureSession", "chat"]);
    expect(chatBody).toMatchObject({
      message: { role: "user", parts: [{ type: "text", text: "Which lens?" }] },
      previousMessageId: null,
      mount: "X",
      locale: "en",
    });
    expect(chatBody).not.toHaveProperty("messages");
  });

  it("sends nothing when the anonymous sign-in fails", async () => {
    vi.mocked(ensureSession).mockResolvedValueOnce(false);
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderChat();
    submit(container, "Which lens?");

    await waitFor(() => expect(ensureSession).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/chat"))).toBe(false);
    expect((container.querySelector("form input") as HTMLInputElement).value).toBe("Which lens?");
  });
});
