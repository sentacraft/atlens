import "server-only";

import type { UIMessage } from "ai";
import type { Locale } from "@/i18n/routing";
import type { Mount } from "@/lib/types";

// D1 caps a row at 2MB.
export const MAX_MESSAGE_BYTES = 1.5 * 1024 * 1024;

export interface AskIrisConversationContext {
  mount: Mount;
  locale: Locale;
}

export interface AskIrisConversationRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface AskIrisConversationMessage {
  id: string;
  conversationId: string;
  role: UIMessage["role"];
  sequence: number;
  message: UIMessage;
  context?: AskIrisConversationContext;
  createdAt: number;
}

export class ConversationOwnershipError extends Error {
  constructor() {
    super("conversation_not_owned");
    this.name = "ConversationOwnershipError";
  }
}

function byteLength(json: string): number {
  return new TextEncoder().encode(json).byteLength;
}

// An oversized message keeps only its text, so the turns after it can still be saved.
export function serializeMessage(message: UIMessage): string {
  const json = JSON.stringify(message);
  if (byteLength(json) <= MAX_MESSAGE_BYTES) {
    return json;
  }
  const textOnly = JSON.stringify({
    ...message,
    parts: message.parts.filter((part) => part.type === "text"),
  });
  if (byteLength(textOnly) > MAX_MESSAGE_BYTES) {
    throw new Error("message_too_large");
  }
  return textOnly;
}

async function assertOwnedOrNew(db: D1Database, conversationId: string, userId: string) {
  const conversation = await db
    .prepare("SELECT user_id FROM askiris_conversations WHERE id = ?")
    .bind(conversationId)
    .first<{ user_id: string }>();
  if (conversation && conversation.user_id !== userId) {
    throw new ConversationOwnershipError();
  }
}

/** The stored history a new turn builds on; empty for a conversation not saved yet. */
export async function loadAskIrisTurnHistory(
  db: D1Database,
  input: { conversationId: string; userId: string },
): Promise<UIMessage[]> {
  await assertOwnedOrNew(db, input.conversationId, input.userId);
  const rows = await getAskIrisConversationMessages(db, input);
  return rows.map((row) => row.message);
}

/**
 * Appends one turn after the conversation's last stored message. With
 * `replaceAfterMessageId` (a regenerate), everything stored after that user message
 * is deleted first, and only the response is appended.
 */
export async function appendAskIrisTurn(
  db: D1Database,
  input: {
    conversationId: string;
    userId: string;
    title: string;
    userMessage?: UIMessage;
    replaceAfterMessageId?: string;
    responseMessage?: UIMessage;
    context: AskIrisConversationContext;
    now: number;
  },
): Promise<void> {
  await assertOwnedOrNew(db, input.conversationId, input.userId);

  const context = JSON.stringify(input.context);
  const statements = [
    db
      .prepare(
        `INSERT INTO askiris_conversations (id, user_id, title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
         WHERE askiris_conversations.user_id = excluded.user_id`,
      )
      .bind(input.conversationId, input.userId, input.title, input.now, input.now),
  ];

  if (input.replaceAfterMessageId) {
    statements.push(
      db
        .prepare(
          `DELETE FROM askiris_messages
           WHERE conversation_id = ?
             AND sequence > (
               SELECT sequence FROM askiris_messages WHERE id = ? AND conversation_id = ?
             )`,
        )
        .bind(input.conversationId, input.replaceAfterMessageId, input.conversationId),
    );
  }

  for (const message of [input.userMessage, input.responseMessage]) {
    if (!message) {
      continue;
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO askiris_messages (
             id, conversation_id, role, sequence, message_json, context_json, created_at
           )
           SELECT ?, ?, ?, COALESCE(MAX(sequence) + 1, 0), ?, ?, ?
           FROM askiris_messages
           WHERE conversation_id = ?`,
        )
        .bind(
          message.id,
          input.conversationId,
          message.role,
          serializeMessage(message),
          context,
          input.now,
          input.conversationId,
        ),
    );
  }

  await db.batch(statements);
}

export async function transferAskIrisConversations(
  db: D1Database,
  input: { fromUserId: string; toUserId: string },
): Promise<void> {
  await db
    .prepare("UPDATE askiris_conversations SET user_id = ? WHERE user_id = ?")
    .bind(input.toUserId, input.fromUserId)
    .run();
}

export async function listAskIrisConversations(
  db: D1Database,
  userId: string,
): Promise<AskIrisConversationRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, created_at, updated_at
       FROM askiris_conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
    )
    .bind(userId)
    .all<{
      id: string;
      title: string;
      created_at: number;
      updated_at: number;
    }>();

  return results.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getAskIrisConversationMessages(
  db: D1Database,
  input: { conversationId: string; userId: string },
): Promise<AskIrisConversationMessage[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.conversation_id, m.role, m.sequence, m.message_json,
              m.context_json, m.created_at
       FROM askiris_messages AS m
       INNER JOIN askiris_conversations AS c ON c.id = m.conversation_id
       WHERE m.conversation_id = ? AND c.user_id = ?
       ORDER BY m.sequence ASC`,
    )
    .bind(input.conversationId, input.userId)
    .all<{
      id: string;
      conversation_id: string;
      role: UIMessage["role"];
      sequence: number;
      message_json: string;
      context_json: string | null;
      created_at: number;
    }>();

  return results.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    sequence: row.sequence,
    message: JSON.parse(row.message_json) as UIMessage,
    context: row.context_json
      ? (JSON.parse(row.context_json) as AskIrisConversationContext)
      : undefined,
    createdAt: row.created_at,
  }));
}

/** The turn a stored response answers, or null unless the response belongs to `userId`. */
export async function getOwnedAskIrisResponseTurnId(
  db: D1Database,
  input: { responseMessageId: string; userId: string },
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT json_extract(m.message_json, '$.metadata.turnId') AS turn_id
       FROM askiris_messages AS m
       INNER JOIN askiris_conversations AS c ON c.id = m.conversation_id
       WHERE m.id = ? AND m.role = 'assistant' AND c.user_id = ?`,
    )
    .bind(input.responseMessageId, input.userId)
    .first<{ turn_id: string | null }>();
  return row?.turn_id ?? null;
}
