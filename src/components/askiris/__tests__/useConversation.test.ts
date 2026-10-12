// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { useConversation } from "../useConversation";

const client = vi.hoisted(() => ({
  fetchConversationList: vi.fn(),
  fetchConversationMessages: vi.fn(),
}));

vi.mock("@/lib/askiris/conversation-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/askiris/conversation-client")>()),
  ...client,
}));

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

function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
    sessionPending: false,
    authenticated: true,
    busy: false,
    stop: vi.fn(),
    setMessages: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
  const hook = renderHook((p: Props) => useConversation(p), { initialProps: props });
  return { ...hook, props };
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
  it("opens a selected conversation and pushes it onto history", async () => {
    client.fetchConversationMessages.mockResolvedValue([message("a1")]);
    const { result, props } = setup();
    const lengthBefore = window.history.length;

    act(() => result.current.selectConversation("conv-a"));

    await waitFor(() => expect(result.current.conversationId).toBe("conv-a"));
    expect(props.setMessages).toHaveBeenLastCalledWith([message("a1")]);
    expect(param()).toBe("conv-a");
    expect(window.history.length).toBe(lengthBefore + 1);
  });

  it("drops a slow load that a later selection superseded", async () => {
    const slow = deferred<AskIrisUIMessage[]>();
    client.fetchConversationMessages
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce([message("b1")]);
    const { result, props } = setup();

    act(() => result.current.selectConversation("conv-a"));
    act(() => result.current.selectConversation("conv-b"));
    await waitFor(() => expect(result.current.conversationId).toBe("conv-b"));
    await act(async () => slow.resolve([message("a1")]));

    expect(result.current.conversationId).toBe("conv-b");
    expect(props.setMessages).not.toHaveBeenCalledWith([message("a1")]);
    expect(param()).toBe("conv-b");
  });

  it("keeps a new chat when a pending load resolves afterwards", async () => {
    const slow = deferred<AskIrisUIMessage[]>();
    client.fetchConversationMessages.mockReturnValueOnce(slow.promise);
    const { result, props } = setup();

    act(() => result.current.selectConversation("conv-a"));
    act(() => result.current.startNewConversation());
    const newId = result.current.conversationId;
    await act(async () => slow.resolve([message("a1")]));

    expect(result.current.conversationId).toBe(newId);
    expect(result.current.loading).toBe(false);
    expect(props.setMessages).not.toHaveBeenCalledWith([message("a1")]);
    expect(param()).toBeNull();
  });

  it("records a sent turn in the URL without adding a history entry", () => {
    const { result } = setup();
    const lengthBefore = window.history.length;

    act(() => result.current.commitConversationUrl());
    act(() => result.current.commitConversationUrl());

    expect(param()).toBe(result.current.conversationId);
    expect(window.history.length).toBe(lengthBefore);
  });

  it("leaves the URL alone for a signed-out sender", () => {
    const { result } = setup({ authenticated: false });

    act(() => result.current.commitConversationUrl());

    expect(param()).toBeNull();
  });

  it("refuses to switch while a reply is streaming", () => {
    const { result, props } = setup({ busy: true });
    const idBefore = result.current.conversationId;

    act(() => result.current.selectConversation("conv-a"));
    act(() => result.current.startNewConversation());

    expect(client.fetchConversationMessages).not.toHaveBeenCalled();
    expect(props.stop).not.toHaveBeenCalled();
    expect(result.current.conversationId).toBe(idBefore);
  });

  it("follows Back and Forward between conversations", async () => {
    client.fetchConversationMessages.mockResolvedValue([message("a1")]);
    const { result, props } = setup();
    const newId = result.current.conversationId;

    window.history.pushState(null, "", "/en/askiris?conversation=conv-a");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    await waitFor(() => expect(result.current.conversationId).toBe("conv-a"));

    window.history.replaceState(null, "", "/en/askiris");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(result.current.conversationId).not.toBe("conv-a");
    expect(result.current.conversationId).not.toBe(newId);
    expect(props.setMessages).toHaveBeenLastCalledWith([]);
  });

  it("starts fresh and says so when a linked conversation is gone", async () => {
    client.fetchConversationMessages.mockResolvedValue("not_found");
    window.history.replaceState(null, "", "/en/askiris?conversation=conv-gone");

    const { result } = setup({ initialConversationId: "conv-gone" });

    await waitFor(() => expect(result.current.notice).toBe("notFound"));
    expect(result.current.conversationId).not.toBe("conv-gone");
    expect(param()).toBeNull();
  });

  it("keeps the current conversation when a load fails", async () => {
    client.fetchConversationMessages.mockRejectedValue(new Error("offline"));
    const { result, props } = setup();
    const idBefore = result.current.conversationId;

    act(() => result.current.selectConversation("conv-a"));

    await waitFor(() => expect(result.current.notice).toBe("loadFailed"));
    expect(result.current.conversationId).toBe(idBefore);
    expect(props.setMessages).not.toHaveBeenCalled();
    expect(param()).toBeNull();
  });

  it("waits for the session, then drops a link a signed-out visitor cannot open", async () => {
    window.history.replaceState(null, "", "/en/askiris?conversation=conv-a");
    const { rerender, props } = setup({
      initialConversationId: "conv-a",
      sessionPending: true,
      authenticated: false,
    });
    expect(param()).toBe("conv-a");

    rerender({ ...props, sessionPending: false });

    expect(param()).toBeNull();
    expect(client.fetchConversationMessages).not.toHaveBeenCalled();
  });

  it("refreshes the list after a reply without showing the loading state", async () => {
    client.fetchConversationList.mockResolvedValueOnce([]);
    const { result, rerender, props } = setup();
    await waitFor(() => expect(result.current.listState).toBe("ready"));
    const updated = [{ id: "conv-a", title: "A", createdAt: 1, updatedAt: 2 }];
    const refresh = deferred<typeof updated>();
    client.fetchConversationList.mockReturnValueOnce(refresh.promise);

    rerender({ ...props, busy: true });
    rerender({ ...props, busy: false });
    expect(result.current.listState).toBe("ready");
    await act(async () => refresh.resolve(updated));

    expect(result.current.conversations).toEqual(updated);
  });
});
