// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { completeApproval, openChat, replyingChat, retryChat } from "../live-chats";

function message(id: string): AskIrisUIMessage {
  return { id, role: "user", parts: [{ type: "text", text: id }] } as AskIrisUIMessage;
}

function pendingApproval(id: string, toolName = "myGear"): AskIrisUIMessage[] {
  return [message(`u-${id}`), {
    id: `a-${id}`, role: "assistant", parts: [{
      type: `tool-${toolName}`, toolCallId: `call-${id}`, input: {}, state: "approval-requested", approval: { id },
    }],
  }] as AskIrisUIMessage[];
}

const body = { mount: "X", locale: "en" };

afterEach(() => {
  vi.restoreAllMocks();
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

  it.each(["myGear", "myFavorites"])("keeps a paused %s approval through remount and stale server reload", (toolName) => {
    const seed = pendingApproval(`sign-${toolName}`, toolName);
    const first = openChat(`conv-sign-${toolName}`, seed);
    openChat(`temporary-pending-${toolName}`, []);
    expect(openChat(`conv-sign-${toolName}`, structuredClone(seed))).toBe(first);
  });

  it.each(["myGear", "myFavorites"])("keeps a new %s approval when the remount seed is still empty", (toolName) => {
    const id = `new-pending-${toolName}`;
    const chat = openChat(id, []);
    chat.messages = pendingApproval(id, toolName);
    openChat(`temporary-${id}`, []);
    expect(openChat(id, [])).toBe(chat);
  });

  it.each([true, false])("submits approval %s once and ignores a stale pending seed after remount", async (approved) => {
    const id = `finish-${approved}`;
    const seed = pendingApproval(id);
    const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const chat = openChat(`conv-${id}`, seed);
    completeApproval(chat, id, approved, body);
    completeApproval(chat, id, !approved, body);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(openChat(`conv-${id}`, structuredClone(seed))).toBe(chat);
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.message.parts[0]).toMatchObject({ type: "tool-myGear", state: "approval-responded", approval: { id, approved } });
    expect(payload).toMatchObject(body);
  });

  it("claims an approval synchronously before the SDK updates its state", () => {
    const seed = pendingApproval("claim");
    const chat = openChat("conv-claim", seed);
    const respond = vi.spyOn(chat, "addToolApprovalResponse").mockImplementation(() => new Promise(() => {}));
    completeApproval(chat, "claim", false, body);
    completeApproval(openChat("conv-claim", structuredClone(seed)), "claim", true, body);
    expect(respond).toHaveBeenCalledExactlyOnceWith({ id: "claim", approved: false, options: { body } });
  });

  it("does not answer a missing, old, or already answered approval", () => {
    const seed = pendingApproval("inactive");
    const chat = openChat("conv-inactive", [...seed, message("new-question")]);
    const respond = vi.spyOn(chat, "addToolApprovalResponse");
    completeApproval(chat, "inactive", true, body);
    completeApproval(chat, "missing", true, body);
    expect(respond).not.toHaveBeenCalled();
    const answered = pendingApproval("answered");
    answered[1].parts = [{ type: "tool-myGear", toolCallId: "call-answered", state: "approval-responded", input: {}, approval: { id: "answered", approved: false } }];
    const completed = openChat("conv-answered", answered);
    const completedRespond = vi.spyOn(completed, "addToolApprovalResponse");
    completeApproval(completed, "answered", true, body);
    expect(completedRespond).not.toHaveBeenCalled();
  });

  it("keeps a locally answered approval when a stale seed returns after the reply finishes", async () => {
    const seed = pendingApproval("late");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response('data: {"type":"start","messageId":"continued"}\n\ndata: {"type":"start-step"}\n\ndata: {"type":"text-start","id":"t"}\n\ndata: {"type":"text-delta","id":"t","delta":"Gear loaded."}\n\ndata: {"type":"text-end","id":"t"}\n\ndata: {"type":"finish-step"}\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n', { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } })));
    const chat = openChat("conv-late", seed);
    completeApproval(chat, "late", true, body);
    await vi.waitFor(() => expect(chat.messages.at(-1)?.id).toBe("continued"));
    await vi.waitFor(() => expect(chat.status).toBe("ready"));
    expect(openChat("conv-late", structuredClone(seed))).toBe(chat);
  });

  it.each([
    [false, "empty"], [true, "empty"], [false, "pending"], [true, "pending"],
  ] as const)("keeps a new chat's %s approval with a stale %s seed after a failed continuation", async (approved, stale) => {
    let requests = 0;
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => {
      if (++requests > 1) {throw new Error("Network unavailable");}
      const parts = [
        { type: "start", messageId: "new-sign-in" },
        { type: "start-step" },
        { type: "tool-input-available", toolCallId: "new-sign-call", toolName: "myGear", input: {} },
        { type: "tool-approval-request", approvalId: "new-sign-approval", toolCallId: "new-sign-call" },
        { type: "finish-step" },
        { type: "finish", finishReason: "tool-calls" },
      ];
      return new Response(parts.map((part) => `data: ${JSON.stringify(part)}\n\n`).join("") + "data: [DONE]\n\n", {
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
      });
    }));
    const id = `conv-new-${approved}-${stale}`;
    const chat = openChat(id, []);
    await chat.sendMessage({ text: "Which lenses do I own?" });
    const pending = structuredClone(chat.messages);
    completeApproval(chat, "new-sign-approval", approved, body);
    await vi.waitFor(() => expect(chat.status).toBe("error"));
    openChat(`temporary-${approved}-${stale}`, []);
    const restored = openChat(id, stale === "empty" ? [] : pending);
    expect(restored).toBe(chat);
    expect(restored.messages.at(-1)?.parts).toContainEqual(expect.objectContaining({ state: "approval-responded", approval: expect.objectContaining({ approved }) }));
  });

  it("uses a server-completed approval instead of retaining a stale pending card", () => {
    const pending = pendingApproval("server");
    const original = openChat("conv-server", pending);
    const complete = structuredClone(pending);
    complete[1].parts = [{ type: "tool-myGear", toolCallId: "call-server", input: {}, state: "output-available", approval: { id: "server", approved: true }, output: { lenses: [] } }];
    expect(openChat("conv-server", complete)).not.toBe(original);
  });

  it("accepts the server's saved answer once a local decision has been persisted", async () => {
    const seed = pendingApproval("saved");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => { throw new Error("Network unavailable"); }));
    const original = openChat("conv-saved", seed);
    completeApproval(original, "saved", false, body);
    await vi.waitFor(() => expect(original.status).toBe("error"));
    expect(openChat("conv-saved", structuredClone(original.messages))).not.toBe(original);
  });

  it("loads original myGear history without changing its protocol", () => {
    const seed: AskIrisUIMessage[] = [{ id: "original-gear", role: "assistant", parts: [{
      type: "tool-myGear", toolCallId: "original-call", input: {}, state: "output-available", output: { lenses: [] },
    }] }];
    expect(openChat("conv-original-gear", seed).messages).toEqual(seed);
  });

  it.each([true, false])("retries a loaded %s approval by resending its response", async (approved) => {
    const seed = pendingApproval(`retry-${approved}`);
    seed[1].parts = [{ type: "tool-myGear", toolCallId: `call-retry-${approved}`, input: {}, state: "approval-responded", approval: { id: `retry-${approved}`, approved } }];
    const chat = openChat(`conv-retry-${approved}`, seed);
    const send = vi.spyOn(chat, "sendMessage").mockResolvedValue(undefined);
    const regenerate = vi.spyOn(chat, "regenerate").mockResolvedValue(undefined);
    await retryChat(chat, body);
    expect(send).toHaveBeenCalledExactlyOnceWith(undefined, { body });
    expect(regenerate).not.toHaveBeenCalled();
  });

  it("regenerates an ordinary failed answer", async () => {
    const chat = openChat("conv-retry-normal", [message("ordinary")]);
    const send = vi.spyOn(chat, "sendMessage").mockResolvedValue(undefined);
    const regenerate = vi.spyOn(chat, "regenerate").mockResolvedValue(undefined);
    await retryChat(chat, body);
    expect(regenerate).toHaveBeenCalledExactlyOnceWith({ body });
    expect(send).not.toHaveBeenCalled();
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
