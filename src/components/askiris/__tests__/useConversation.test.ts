// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { useConversation, useTurnSync } from "../useConversation";

const client = vi.hoisted(() => ({
  fetchConversationList: vi.fn(),
  fetchConversationMessages: vi.fn(),
}));

vi.mock("@/lib/askiris/conversation-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/askiris/conversation-client")>();
  return {
    ...actual,
    ...client,
    conversationMessagesQuery: (id: string) => ({
      ...actual.conversationMessagesQuery(id),
      queryFn: () => client.fetchConversationMessages(id),
    }),
  };
});

function message(id: string): AskIrisUIMessage {
  return { id, role: "user", parts: [{ type: "text", text: id }] } as AskIrisUIMessage;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

type Props = Parameters<typeof useConversation>[0];
type TurnProps = Omit<Parameters<typeof useTurnSync>[0], "conversationId" | "userId">;

function queryWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function setup(overrides: Partial<Props> = {}) {
  const props: Props = { userId: "user-1", onNotice: vi.fn(), ...overrides };
  const hook = renderHook((p: Props) => useConversation(p), {
    initialProps: props,
    wrapper: queryWrapper(),
  });
  return { ...hook, props };
}

// Both hooks over one query cache, as AskIrisChat uses them.
function setupWithTurns(userId: string | undefined = "user-1") {
  const turn: TurnProps = { busy: false, turnFailed: false, historyChanged: false, setMessages: vi.fn() };
  const hook = renderHook(
    (t: TurnProps) => {
      const conversation = useConversation({ userId, onNotice: vi.fn() });
      useTurnSync({ conversationId: conversation.conversationId, userId, ...t });
      return conversation;
    },
    { initialProps: turn, wrapper: queryWrapper() },
  );
  return { ...hook, turn };
}

function param() {
  return new URL(window.location.href).searchParams.get("conversation");
}

beforeEach(() => {
  window.history.replaceState(null, "", "/en/askiris");
  client.fetchConversationList.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useConversation", () => {
  it("opens a selected conversation with its messages and pushes it onto history", async () => {
    client.fetchConversationMessages.mockResolvedValue([message("a1")]);
    const { result } = setup();
    const lengthBefore = window.history.length;

    act(() => result.current.selectConversation("conv-a"));

    await waitFor(() => expect(result.current.conversationId).toBe("conv-a"));
    expect(result.current.initialMessages).toEqual([message("a1")]);
    expect(param()).toBe("conv-a");
    expect(window.history.length).toBe(lengthBefore + 1);
  });

  it("keeps the current id until the selected conversation has loaded", async () => {
    const slow = deferred<AskIrisUIMessage[]>();
    client.fetchConversationMessages.mockReturnValueOnce(slow.promise);
    const { result } = setup();
    const idBefore = result.current.conversationId;

    act(() => result.current.selectConversation("conv-a"));

    expect(result.current.loading).toBe(true);
    expect(result.current.conversationId).toBe(idBefore);
    await act(async () => slow.resolve([message("a1")]));
    expect(result.current.conversationId).toBe("conv-a");
  });

  it("drops a slow load that a later selection superseded", async () => {
    const slow = deferred<AskIrisUIMessage[]>();
    client.fetchConversationMessages
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce([message("b1")]);
    const { result } = setup();

    act(() => result.current.selectConversation("conv-a"));
    act(() => result.current.selectConversation("conv-b"));
    await waitFor(() => expect(result.current.conversationId).toBe("conv-b"));
    await act(async () => slow.resolve([message("a1")]));

    expect(result.current.conversationId).toBe("conv-b");
    expect(result.current.initialMessages).toEqual([message("b1")]);
    expect(param()).toBe("conv-b");
  });

  it("keeps a new chat when a pending load resolves afterwards", async () => {
    const slow = deferred<AskIrisUIMessage[]>();
    client.fetchConversationMessages.mockReturnValueOnce(slow.promise);
    const { result } = setup();

    act(() => result.current.selectConversation("conv-a"));
    act(() => result.current.startNewConversation());
    const newId = result.current.conversationId;
    await act(async () => slow.resolve([message("a1")]));

    expect(result.current.conversationId).toBe(newId);
    expect(result.current.initialMessages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(param()).toBeNull();
  });

  it("refetches a conversation it opened before", async () => {
    client.fetchConversationMessages
      .mockResolvedValueOnce([message("a1")])
      .mockResolvedValueOnce([message("a1"), message("a2")]);
    const { result } = setup();

    act(() => result.current.selectConversation("conv-a"));
    await waitFor(() => expect(result.current.conversationId).toBe("conv-a"));
    act(() => result.current.startNewConversation());
    act(() => result.current.selectConversation("conv-a"));

    await waitFor(() =>
      expect(result.current.initialMessages).toEqual([message("a1"), message("a2")]),
    );
  });

  it("follows Back and Forward between conversations", async () => {
    client.fetchConversationMessages.mockResolvedValue([message("a1")]);
    const { result } = setup();
    const newId = result.current.conversationId;

    window.history.pushState(null, "", "/en/askiris?conversation=conv-a");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    await waitFor(() => expect(result.current.conversationId).toBe("conv-a"));

    window.history.replaceState(null, "", "/en/askiris");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(result.current.conversationId).not.toBe("conv-a");
    expect(result.current.conversationId).not.toBe(newId);
    expect(result.current.initialMessages).toEqual([]);
  });

  it("starts fresh and says so when a linked conversation is gone", async () => {
    client.fetchConversationMessages.mockResolvedValue("unavailable");
    window.history.replaceState(null, "", "/en/askiris?conversation=conv-gone");

    const { result, props } = setup({ initialConversationId: "conv-gone" });

    await waitFor(() => expect(props.onNotice).toHaveBeenCalledWith("unavailable"));
    expect(result.current.conversationId).not.toBe("conv-gone");
    expect(param()).toBeNull();
  });

  it("keeps the current conversation when a load fails", async () => {
    client.fetchConversationMessages.mockRejectedValue(new Error("offline"));
    const { result, props } = setup();
    const idBefore = result.current.conversationId;

    act(() => result.current.selectConversation("conv-a"));

    await waitFor(() => expect(props.onNotice).toHaveBeenCalledWith("loadFailed"));
    expect(result.current.conversationId).toBe(idBefore);
    expect(result.current.loading).toBe(false);
    expect(param()).toBeNull();
  });

  it("loads a linked conversation without waiting for the session", async () => {
    client.fetchConversationMessages.mockResolvedValue("unavailable");
    window.history.replaceState(null, "", "/en/askiris?conversation=conv-a");

    const { result, props } = setup({ initialConversationId: "conv-a", userId: undefined });

    await waitFor(() => expect(props.onNotice).toHaveBeenCalledWith("unavailable"));
    expect(client.fetchConversationMessages).toHaveBeenCalledWith("conv-a");
    expect(param()).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("starts in the loading state for a linked conversation", async () => {
    client.fetchConversationMessages.mockResolvedValue([message("a1")]);
    window.history.replaceState(null, "", "/en/askiris?conversation=conv-a");

    const { result } = setup({ initialConversationId: "conv-a" });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.conversationId).toBe("conv-a"));
    expect(result.current.loading).toBe(false);
  });

  it("never shows one account's list to the next account in the same tab", async () => {
    const first = [{ id: "conv-1", title: "First", createdAt: 1, updatedAt: 1 }];
    client.fetchConversationList.mockResolvedValueOnce(first);
    const { result, rerender, props } = setup();
    await waitFor(() => expect(result.current.conversations).toEqual(first));
    const pending = deferred<typeof first>();
    client.fetchConversationList.mockReturnValueOnce(pending.promise);

    rerender({ ...props, userId: "user-2" });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.listState).toBe("loading");
    await act(async () => pending.resolve([]));
  });
});

describe("useTurnSync", () => {
  it("names the conversation in the URL once a turn ends, for any visitor", () => {
    const { result, rerender, turn } = setupWithTurns(undefined);
    expect(param()).toBeNull();
    const lengthBefore = window.history.length;

    rerender({ ...turn, busy: true });
    rerender({ ...turn, busy: false });

    expect(param()).toBe(result.current.conversationId);
    expect(window.history.length).toBe(lengthBefore);
  });

  it("keeps a conversation whose turn failed out of the URL", () => {
    const { rerender, turn } = setupWithTurns();

    rerender({ ...turn, busy: true });
    rerender({ ...turn, busy: false, turnFailed: true });

    expect(param()).toBeNull();
  });

  it("reloads the conversation when the server reports a history the client had not seen", async () => {
    const serverHistory = [message("u0"), message("u1")];
    client.fetchConversationMessages.mockResolvedValue(serverHistory);
    const { result, rerender, turn } = setupWithTurns();

    rerender({ ...turn, busy: true, historyChanged: true });
    rerender({ ...turn, busy: false, historyChanged: true });

    await waitFor(() => expect(turn.setMessages).toHaveBeenLastCalledWith(serverHistory));
    expect(client.fetchConversationMessages).toHaveBeenCalledWith(result.current.conversationId);
  });

  it("does not reload after a turn on an unchanged history", () => {
    const { rerender, turn } = setupWithTurns();

    rerender({ ...turn, busy: true });
    rerender({ ...turn, busy: false });

    expect(client.fetchConversationMessages).not.toHaveBeenCalled();
  });

  it("refreshes the list after a reply without showing the loading state", async () => {
    client.fetchConversationList.mockResolvedValueOnce([]);
    const { result, rerender, turn } = setupWithTurns();
    await waitFor(() => expect(result.current.listState).toBe("ready"));
    const updated = [{ id: "conv-a", title: "A", createdAt: 1, updatedAt: 2 }];
    const refresh = deferred<typeof updated>();
    client.fetchConversationList.mockReturnValueOnce(refresh.promise);

    rerender({ ...turn, busy: true });
    rerender({ ...turn, busy: false });
    await waitFor(() => expect(client.fetchConversationList).toHaveBeenCalledTimes(2));
    expect(result.current.listState).toBe("ready");
    await act(async () => refresh.resolve(updated));

    await waitFor(() => expect(result.current.conversations).toEqual(updated));
  });
});
