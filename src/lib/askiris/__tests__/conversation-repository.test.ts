import { describe, expect, it, vi } from "vitest";
import {
  ConversationOwnershipError,
  getAskIrisConversationMessages,
  listAskIrisConversations,
  saveAskIrisConversationTurn,
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

describe("saveAskIrisConversationTurn", () => {
  it("creates a conversation and inserts each message once", async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const prepare = vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ first }) });
    const batch = vi.fn().mockResolvedValue([]);
    const db = { prepare, batch } as unknown as D1Database;

    await saveAskIrisConversationTurn(db, {
      conversationId: "conversation-1",
      userId: "user-1",
      title: "Which lens is lighter?",
      messages,
      currentTurnId: "user-1",
      responseMessageId: "assistant-1",
      context: { mount: "X", locale: "en" },
      now: 1_800_000_000_000,
    });

    expect(batch).toHaveBeenCalledOnce();
    expect(batch.mock.calls[0][0]).toHaveLength(3);
    expect(prepare.mock.calls[0][0]).toContain("SELECT user_id");
  });

  it("rejects a conversation owned by another user", async () => {
    const prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ user_id: "other-user" }),
      }),
    });
    const batch = vi.fn();
    const db = { prepare, batch } as unknown as D1Database;

    await expect(
      saveAskIrisConversationTurn(db, {
        conversationId: "conversation-1",
        userId: "user-1",
        title: "A title",
        messages,
        currentTurnId: "user-1",
        responseMessageId: "assistant-1",
        context: { mount: "X", locale: "en" },
        now: 1,
      }),
    ).rejects.toBeInstanceOf(ConversationOwnershipError);
    expect(batch).not.toHaveBeenCalled();
  });
});

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
