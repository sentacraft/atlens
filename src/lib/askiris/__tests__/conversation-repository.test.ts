import { describe, expect, it, vi } from "vitest";
import {
  getAskIrisConversationMessages,
  listAskIrisConversations,
} from "../conversation-repository";

const messages = [
  {
    id: "user-1",
    role: "user" as const,
    parts: [{ type: "text" as const, text: "Which lens is lighter?" }],
  },
  {
    id: "assistant-1",
    role: "assistant" as const,
    parts: [{ type: "text" as const, text: "The 16-80 is lighter." }],
  },
];

describe("conversation reads", () => {
  it("maps conversation rows to the public repository shape", async () => {
    const all = vi.fn().mockResolvedValue({
      results: [
        {
          id: "conversation-1",
          user_id: "user-1",
          title: "A title",
          created_at: 1,
          updated_at: 2,
        },
      ],
    });
    const prepare = vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ all }) });

    await expect(listAskIrisConversations({ prepare } as unknown as D1Database, "user-1")).resolves.toEqual([
      {
        id: "conversation-1",
        title: "A title",
        createdAt: 1,
        updatedAt: 2,
      },
    ]);
  });

  it("parses stored messages and their turn context", async () => {
    const all = vi.fn().mockResolvedValue({
      results: [
        {
          id: "user-1",
          conversation_id: "conversation-1",
          role: "user",
          sequence: 0,
          message_json: JSON.stringify(messages[0]),
          context_json: JSON.stringify({ mount: "X", locale: "en" }),
          created_at: 1,
        },
      ],
    });
    const prepare = vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ all }) });

    await expect(
      getAskIrisConversationMessages(
        { prepare } as unknown as D1Database,
        { conversationId: "conversation-1", userId: "user-1" },
      ),
    ).resolves.toEqual([
      {
        id: "user-1",
        conversationId: "conversation-1",
        role: "user",
        sequence: 0,
        message: messages[0],
        context: { mount: "X", locale: "en" },
        createdAt: 1,
      },
    ]);
  });
});
