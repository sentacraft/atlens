// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { completeSignIn, openChat, replyingChat } from "../live-chats";

function message(id: string): AskIrisUIMessage {
  return { id, role: "user", parts: [{ type: "text", text: id }] } as AskIrisUIMessage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("live chats", () => {
  it("shares a conversation's chat with a second view while it replies", async () => {
    // A reply that never ends keeps the chat in the submitted state.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const panelChat = openChat("conv-1", []);
    void panelChat.sendMessage({ text: "hi" });
    await vi.waitFor(() => expect(panelChat.status).toBe("submitted"));

    expect(replyingChat("conv-1")).toBe(panelChat);
    expect(openChat("conv-1", [message("loaded")])).toBe(panelChat);
  });

  it("keeps a paused sign-in chat through remount and stale server reload", () => {
    const seed = [message("u-sign"), { id: "a-sign", role: "assistant", parts: [{ type: "tool-askToSignIn", toolCallId: "sign-call", input: {}, state: "input-available" }] }] as AskIrisUIMessage[];
    const first = openChat("conv-sign", seed);
    expect(openChat("conv-sign", structuredClone(seed))).toBe(first);
  });

  it("submits sign-in once and ignores a stale pending seed after remount", async () => {
    const seed = [message("u-finish"), { id: "a-finish", role: "assistant", parts: [{ type: "tool-askToSignIn", toolCallId: "finish-call", input: {}, state: "input-available" }] }] as AskIrisUIMessage[];
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const chat = openChat("conv-finish", seed);
    completeSignIn(chat, "finish-call", { outcome: "signed_in" }, { mount: "X", locale: "en" });
    completeSignIn(chat, "finish-call", { outcome: "signed_in" }, { mount: "X", locale: "en" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(openChat("conv-finish", structuredClone(seed))).toBe(chat);
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.message.parts[0]).toMatchObject({ type: "tool-askToSignIn", output: { outcome: "signed_in" } });
    expect(payload).toMatchObject({ mount: "X", locale: "en" });
  });

  it("keeps a locally answered sign-in when a stale seed returns after the reply finishes", async () => {
    const seed = [message("u-late"), { id: "a-late", role: "assistant", parts: [{ type: "tool-askToSignIn", toolCallId: "late-call", input: {}, state: "input-available" }] }] as AskIrisUIMessage[];
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response('data: {"type":"start","messageId":"continued"}\n\ndata: {"type":"start-step"}\n\ndata: {"type":"text-start","id":"t"}\n\ndata: {"type":"text-delta","id":"t","delta":"Gear loaded."}\n\ndata: {"type":"text-end","id":"t"}\n\ndata: {"type":"finish-step"}\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n', { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } })));
    const chat = openChat("conv-late", seed);
    completeSignIn(chat, "late-call", { outcome: "signed_in" }, { mount: "X", locale: "en" });
    await vi.waitFor(() => expect(chat.messages.at(-1)?.id).toBe("continued"));
    await vi.waitFor(() => expect(chat.status).toBe("ready"));
    expect(openChat("conv-late", structuredClone(seed))).toBe(chat);
  });

  it("uses a server-completed interaction instead of retaining a stale pending card", () => {
    const pending = [message("u-server"), { id: "a-server", role: "assistant", parts: [{ type: "tool-askToSignIn", toolCallId: "server-call", input: {}, state: "input-available" }] }] as AskIrisUIMessage[];
    const original = openChat("conv-server", pending);
    const complete = structuredClone(pending);
    complete[1].parts = [{ type: "tool-askToSignIn", toolCallId: "server-call", input: {}, state: "output-available", output: { outcome: "signed_in" } }];
    expect(openChat("conv-server", complete)).not.toBe(original);
  });

  it("gives a view of an idle conversation a chat of its own", () => {
    const first = openChat("conv-2", [message("a")]);

    expect(replyingChat("conv-2")).toBeUndefined();
    expect(openChat("conv-2", [message("a")])).not.toBe(first);
  });

  it("returns the same chat for the same view rendering twice", () => {
    const seed = [message("b")];

    expect(openChat("conv-3", seed)).toBe(openChat("conv-3", seed));
  });
});
