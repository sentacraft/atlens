import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ConversationOwnershipError,
  getAskIrisConversationMessages,
  saveAskIrisConversationTurn,
} from "../conversation-repository";
import { createSqliteD1 } from "./sqlite-d1";

function text(id: string, role: UIMessage["role"], body: string): UIMessage {
  return { id, role, parts: [{ type: "text", text: body }] };
}

const u1 = text("u1", "user", "Which 23mm?");
const a1 = text("a1", "assistant", "The XF 23mm F2.");
const u2 = text("u2", "user", "Lighter?");

let d1: D1Database;

beforeEach(() => {
  const db = createSqliteD1("migrations/app");
  d1 = db.d1;
  db.sqlite.exec(
    `INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES
      ('user-1', 'Iris', 'i@example.test', 0, 0),
      ('user-2', 'Other', 'o@example.test', 0, 0)`,
  );
});

function save(messages: UIMessage[], turnId: string, responseId: string, now: number) {
  return saveAskIrisConversationTurn(d1, {
    conversationId: "conv-1",
    userId: "user-1",
    title: "Which 23mm?",
    messages,
    currentTurnId: turnId,
    responseMessageId: responseId,
    context: { mount: "X", locale: "en" },
    now,
  });
}

async function stored() {
  const rows = await getAskIrisConversationMessages(d1, {
    conversationId: "conv-1",
    userId: "user-1",
  });
  return rows.map((row) => ({ id: row.id, sequence: row.sequence, createdAt: row.createdAt }));
}

describe("saveAskIrisConversationTurn against SQLite", () => {
  it("creates the conversation and stores each message once", async () => {
    await save([u1, a1], "u1", "a1", 1);
    await save([u1, a1], "u1", "a1", 2);

    expect(await stored()).toEqual([
      { id: "u1", sequence: 0, createdAt: 1 },
      { id: "a1", sequence: 1, createdAt: 1 },
    ]);
  });

  it("refuses to write into another user's conversation", async () => {
    await save([u1, a1], "u1", "a1", 1);

    await expect(
      saveAskIrisConversationTurn(d1, {
        conversationId: "conv-1",
        userId: "user-2",
        title: "Hijack",
        messages: [text("x1", "user", "mine now")],
        currentTurnId: "x1",
        responseMessageId: "x2",
        context: { mount: "X", locale: "en" },
        now: 2,
      }),
    ).rejects.toBeInstanceOf(ConversationOwnershipError);
    expect((await stored()).map((row) => row.id)).toEqual(["u1", "a1"]);
  });

  it("keeps the retried reply, not the failed one it replaced", async () => {
    await save([u1, a1], "u1", "a1", 1);
    const failed = text("r1", "assistant", "Something went wrong mid-");
    await save([u1, a1, u2, failed], "u2", "r1", 2);

    // regenerate() drops the failed reply and the retry answers at the same position.
    const retried = text("r2", "assistant", "The XF 23mm F2.8 is lighter.");
    await save([u1, a1, u2, retried], "u2", "r2", 3);

    expect((await stored()).map((row) => row.id)).toEqual(["u1", "a1", "u2", "r2"]);
  });

  it("keeps a message's original timestamp and turn context across later saves", async () => {
    await save([u1, a1], "u1", "a1", 1);
    await save([u1, a1, u2, text("a2", "assistant", "Yes.")], "u2", "a2", 2);

    const rows = await getAskIrisConversationMessages(d1, {
      conversationId: "conv-1",
      userId: "user-1",
    });
    expect(rows.map((row) => [row.id, row.createdAt, row.context?.mount ?? null])).toEqual([
      ["u1", 1, "X"],
      ["a1", 1, "X"],
      ["u2", 2, "X"],
      ["a2", 2, "X"],
    ]);
  });

  it("keeps saving a conversation after an oversized message, trimming that message", async () => {
    const huge: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "text", text: "Here is the full table." },
        {
          type: "tool-queryLenses",
          toolCallId: "call-1",
          state: "output-available",
          input: {},
          output: { rows: "x".repeat(600 * 1024) },
        } as UIMessage["parts"][number],
      ],
    };
    await save([u1, huge], "u1", "a1", 1);
    await save([u1, huge, u2, text("a2", "assistant", "Yes.")], "u2", "a2", 2);

    const rows = await getAskIrisConversationMessages(d1, {
      conversationId: "conv-1",
      userId: "user-1",
    });
    expect(rows.map((row) => row.id)).toEqual(["u1", "a1", "u2", "a2"]);
    expect(rows[1].message.parts).toEqual([{ type: "text", text: "Here is the full table." }]);
  });
});
