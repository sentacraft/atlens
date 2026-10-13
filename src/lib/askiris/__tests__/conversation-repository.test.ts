import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { createSqliteD1 } from "../../__tests__/support/sqlite-d1";
import {
  appendAskIrisTurn,
  ConversationOwnershipError,
  getAskIrisConversationMessages,
  getOwnedAskIrisResponseTurnId,
  listAskIrisConversations,
  loadAskIrisTurnHistory,
  MAX_MESSAGE_BYTES,
  serializeMessage,
} from "../conversation-repository";

const CONVERSATION = "conversation-1";
const context = { mount: "X", locale: "en" };

function text(id: string, role: "user" | "assistant", body: string): UIMessage {
  return { id, role, parts: [{ type: "text", text: body }] };
}

let db: D1Database;

beforeEach(() => {
  const { d1, sqlite } = createSqliteD1("migrations/app");
  for (const id of ["owner", "stranger"]) {
    sqlite
      .prepare("INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, 0, 0)")
      .run(id, id, `${id}@example.test`);
  }
  db = d1;
});

function append(input: Partial<Parameters<typeof appendAskIrisTurn>[1]> = {}) {
  return appendAskIrisTurn(db, {
    conversationId: CONVERSATION,
    userId: "owner",
    title: "Which lens is lighter?",
    context,
    now: 1,
    ...input,
  });
}

async function storedIds() {
  const rows = await getAskIrisConversationMessages(db, {
    conversationId: CONVERSATION,
    userId: "owner",
  });
  return rows.map((row) => [row.sequence, row.id]);
}

describe("appendAskIrisTurn", () => {
  it("appends each turn after the last stored message", async () => {
    await append({ userMessage: text("u1", "user", "a"), responseMessage: text("a1", "assistant", "b") });
    await append({ userMessage: text("u2", "user", "c"), responseMessage: text("a2", "assistant", "d") });

    expect(await storedIds()).toEqual([
      [0, "u1"],
      [1, "a1"],
      [2, "u2"],
      [3, "a2"],
    ]);
  });

  it("keeps both turns when they finish out of order", async () => {
    await append({ userMessage: text("u2", "user", "second"), responseMessage: text("a2", "assistant", "x") });
    await append({ userMessage: text("u1", "user", "first"), responseMessage: text("a1", "assistant", "y") });

    expect((await storedIds()).map(([, id]) => id)).toEqual(["u2", "a2", "u1", "a1"]);
  });

  it("replaces the answer after a regenerated user message", async () => {
    await append({ userMessage: text("u1", "user", "a"), responseMessage: text("a1", "assistant", "old") });

    await append({ replaceAfterMessageId: "u1", responseMessage: text("a1b", "assistant", "new") });

    expect(await storedIds()).toEqual([
      [0, "u1"],
      [1, "a1b"],
    ]);
  });

  it("stores the user message of a turn with nothing to keep in its response", async () => {
    await append({ userMessage: text("u1", "user", "a") });

    expect(await storedIds()).toEqual([[0, "u1"]]);
  });

  it("rejects a conversation owned by another user without writing", async () => {
    await append({ userMessage: text("u1", "user", "a") });

    await expect(
      append({ userId: "stranger", userMessage: text("u9", "user", "b") }),
    ).rejects.toBeInstanceOf(ConversationOwnershipError);
    expect(await storedIds()).toEqual([[0, "u1"]]);
  });

  it("stores the turn context with each message", async () => {
    await append({ userMessage: text("u1", "user", "a") });

    const [row] = await getAskIrisConversationMessages(db, {
      conversationId: CONVERSATION,
      userId: "owner",
    });
    expect(row.context).toEqual(context);
  });
});

describe("loadAskIrisTurnHistory", () => {
  it("returns stored messages in order, and nothing for a new conversation", async () => {
    expect(await loadAskIrisTurnHistory(db, { conversationId: CONVERSATION, userId: "owner" })).toEqual([]);

    const user = text("u1", "user", "a");
    await append({ userMessage: user });

    expect(await loadAskIrisTurnHistory(db, { conversationId: CONVERSATION, userId: "owner" })).toEqual([user]);
  });

  it("refuses another user's conversation", async () => {
    await append({ userMessage: text("u1", "user", "a") });

    await expect(
      loadAskIrisTurnHistory(db, { conversationId: CONVERSATION, userId: "stranger" }),
    ).rejects.toBeInstanceOf(ConversationOwnershipError);
  });
});

describe("listAskIrisConversations", () => {
  it("lists only the user's own conversations", async () => {
    await append({ userMessage: text("u1", "user", "a") });

    expect(await listAskIrisConversations(db, "owner")).toEqual([
      { id: CONVERSATION, title: "Which lens is lighter?", createdAt: 1, updatedAt: 1 },
    ]);
    expect(await listAskIrisConversations(db, "stranger")).toEqual([]);
  });
});

describe("getOwnedAskIrisResponseTurnId", () => {
  beforeEach(async () => {
    await append({
      userMessage: text("u1", "user", "a"),
      responseMessage: { ...text("a1", "assistant", "b"), metadata: { turnId: "u1" } },
    });
  });

  it("returns the turn of a response the user owns", async () => {
    await expect(
      getOwnedAskIrisResponseTurnId(db, { responseMessageId: "a1", userId: "owner" }),
    ).resolves.toBe("u1");
  });

  it("returns null for another user's response, a user message, or an unknown id", async () => {
    for (const [responseMessageId, userId] of [
      ["a1", "stranger"],
      ["u1", "owner"],
      ["missing", "owner"],
    ]) {
      await expect(
        getOwnedAskIrisResponseTurnId(db, { responseMessageId, userId }),
      ).resolves.toBeNull();
    }
  });
});

describe("serializeMessage", () => {
  it("keeps only the text of a message over the size limit", () => {
    const huge = "x".repeat(MAX_MESSAGE_BYTES);
    const message = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "text", text: "kept" },
        {
          type: "tool-queryLenses",
          toolCallId: "call-1",
          state: "output-available",
          input: {},
          output: huge,
        },
      ],
    } as UIMessage;

    expect(JSON.parse(serializeMessage(message)).parts).toEqual([{ type: "text", text: "kept" }]);
  });

  it("refuses a message whose text alone is over the limit", () => {
    expect(() => serializeMessage(text("a1", "assistant", "x".repeat(MAX_MESSAGE_BYTES)))).toThrow(
      "message_too_large",
    );
  });
});
