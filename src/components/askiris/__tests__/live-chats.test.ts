// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { openChat, replyingChat } from "../live-chats";

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
