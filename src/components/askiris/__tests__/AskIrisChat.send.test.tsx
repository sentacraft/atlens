// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureSession } from "@/lib/auth-client";
import { track } from "@/lib/analytics/analytics";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AskIrisChat, { type AskIrisShell } from "../AskIrisChat";
import type { LensSummary } from "@/lib/lens/data";

vi.mock("next-intl", () => {
  const t = Object.assign((key: string) => key, {
    raw: (key: string) => (key.endsWith("Suggestions") ? [`${key}-1`] : []),
    rich: (key: string) => key,
    has: () => false,
  });
  return { useTranslations: () => t, useLocale: () => "en" };
});
const openIris = vi.hoisted(() => vi.fn());
vi.mock("@/context/IrisPanelProvider", () => ({ useIris: () => ({ openIris, closeIris: vi.fn(), irisShown: false }) }));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/i18n/navigation", () => ({ Link: (props: object) => <a {...props} /> }));
vi.mock("@/components/iris/Iris", () => ({ default: () => <div data-testid="iris" /> }));
vi.mock("@/components/askiris/useStarters", () => ({ useStarters: () => [{ text: "Starter question", pool: "terms" }] }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/context/TestHookProvider", () => ({
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

// A reply that keeps streaming until the request is aborted.
function openStream(onAbort: () => void, signal?: AbortSignal | null) {
  signal?.addEventListener("abort", onAbort);
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"start"}\n\n'));
      },
    }),
    { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } },
  );
}

const LENSES: LensSummary[] = [
  { id: "xf-56", brand: "fujifilm", series: "XF", model: "XF56mmF1.2 R WR", mount: "X", focalLengthMin: 56, focalLengthMax: 56, maxAperture: 1.2 },
];

function renderChat(shell: AskIrisShell = { variant: "page", entry: {}, starterSeed: 1 }) {
  const client = new QueryClient();
  const view = (next: AskIrisShell) => (
    <QueryClientProvider client={client}>
      <AskIrisChat shell={next} linkTargets={{ lenses: {}, collections: [] }} lenses={LENSES} />
    </QueryClientProvider>
  );
  const result = render(view(shell));
  return { ...result, rerenderChat: (next: AskIrisShell) => result.rerender(view(next)) };
}

const expandedChange = vi.hoisted(() => vi.fn());
const panel = (pagePath: string, request: AskIrisShell & { variant: "panel" } extends { request: infer R } ? R : never = null) =>
  ({ variant: "panel", pagePath, request, onClose: () => {}, expanded: false, onExpandedChange: expandedChange }) as const;

function captureChatBodies() {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/chat")) {
        bodies.push(JSON.parse(String(init?.body)));
        return emptyStream();
      }
      return Response.json({});
    }),
  );
  return bodies;
}

function submit(container: HTMLElement, text: string) {
  const input = container.querySelector("form input")!;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest("form")!);
}

afterEach(() => {
  cleanup();
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
    expect(chatBody).not.toHaveProperty("conversationId");
    expect(chatBody?.id).toMatch(/^[0-9a-f-]{36}$/);
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

  it("asks before a new chat stops a reply in progress", async () => {
    let aborted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).includes("/api/chat")
          ? openStream(() => (aborted = true), init?.signal)
          : Response.json({}),
      ),
    );

    const { container } = renderChat();
    submit(container, "Which lens?");
    await screen.findByRole("button", { name: "stop" });

    fireEvent.click(screen.getByRole("button", { name: "newChat" }));
    fireEvent.click(await screen.findByRole("button", { name: "switchWhileBusyCancel" }));
    expect(aborted).toBe(false);
    expect(screen.getByRole("button", { name: "stop" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "newChat" }));
    fireEvent.click(await screen.findByRole("button", { name: "switchWhileBusyConfirm" }));

    await waitFor(() => expect(aborted).toBe(true));
    await waitFor(() => expect(screen.queryByText("Which lens?")).toBeNull());
  });

  it("sends the page the panel is open beside, and stops once the card's × is pressed", async () => {
    const bodies = captureChatBodies();
    const { container } = renderChat(panel("/en/lenses/x/browse?t=zoom"));

    expect(screen.getByText("browsing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "browseSuggestions-1" }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ page: "/en/lenses/x/browse?t=zoom" });

    fireEvent.click(screen.getByRole("button", { name: "detach" }));
    submit(container, "Lighter, please");
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).not.toHaveProperty("page");
    expect(track).toHaveBeenCalledWith("askiris_message", { method: "suggestion" });
    expect(track).toHaveBeenCalledWith("askiris_context_remove", { page_kind: "browse" });
    expect(track).toHaveBeenCalledWith("askiris_message", { method: "typed" });
  });

  it("records an example question with the pool it came from", async () => {
    const bodies = captureChatBodies();
    renderChat();

    fireEvent.click(screen.getByRole("button", { name: "Starter question" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(track).toHaveBeenCalledWith("askiris_message", { method: "starter", pool: "terms" });
  });

  it("starts a new conversation when an entry on another page opens the panel, and tells a guest how long the old one is kept", async () => {
    const bodies = captureChatBodies();
    const { container, rerenderChat } = renderChat(panel("/en/lenses/x/browse"));
    submit(container, "Which lens?");
    await waitFor(() => expect(bodies).toHaveLength(1));

    rerenderChat(panel("/en/lenses/x/xf-56", { id: 1, kind: "page" }));

    expect(await screen.findByText("newConversationGuest")).toBeInTheDocument();
    expect(screen.queryByText("Which lens?")).toBeNull();
    expect(screen.getByText("lookingAt")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("askiris_new_conversation", { reason: "page_change" });
  });

  it("keeps the conversation when an entry on the same page opens the panel again", async () => {
    const bodies = captureChatBodies();
    const { container, rerenderChat } = renderChat(panel("/en/lenses/x/browse"));
    submit(container, "Which lens?");
    await waitFor(() => expect(bodies).toHaveLength(1));

    rerenderChat(panel("/en/lenses/x/browse?t=prime", { id: 1, kind: "page" }));

    expect(screen.getByText("Which lens?")).toBeInTheDocument();
    expect(screen.queryByText("newConversationGuest")).toBeNull();
  });

  it("sends a question from another page in a new conversation", async () => {
    const bodies = captureChatBodies();
    const { container, rerenderChat } = renderChat(panel("/en/lenses/x/browse"));
    submit(container, "Which lens?");
    await waitFor(() => expect(bodies).toHaveLength(1));

    rerenderChat(panel("/en/lenses/x/xf-56", { id: 1, kind: "question", text: "What is it for?" }));

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toMatchObject({ page: "/en/lenses/x/xf-56", previousMessageId: null });
    expect(bodies[1].id).not.toBe(bodies[0].id);
  });

  it("expands in place from the full-screen button, keeping the unsent input", () => {
    captureChatBodies();
    const { container, rerenderChat } = renderChat(panel("/en/lenses/x/xf-56"));
    fireEvent.change(container.querySelector("form input")!, { target: { value: "And the 50mm?" } });

    fireEvent.click(screen.getByRole("button", { name: "fullScreen" }));
    expect(expandedChange).toHaveBeenLastCalledWith(true);

    rerenderChat({ ...panel("/en/lenses/x/xf-56"), expanded: true });
    expect(container.querySelector("form input")).toHaveValue("And the 50mm?");
    fireEvent.click(screen.getByRole("button", { name: "exitFullScreen" }));
    expect(expandedChange).toHaveBeenLastCalledWith(false);
  });
});
