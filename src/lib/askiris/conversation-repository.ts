import "server-only";

import type { UIMessage } from "ai";

const MAX_MESSAGE_BYTES = 512 * 1024;

export interface AskIrisConversationContext {
  mount: string;
  locale: string;
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

function serializeMessage(message: UIMessage): string {
  const json = JSON.stringify(message);
  if (!json || new TextEncoder().encode(json).byteLength > MAX_MESSAGE_BYTES) {
    throw new Error("message_too_large");
  }
  return json;
}

function serializeContext(context: AskIrisConversationContext): string {
  return JSON.stringify(context);
}

function getMessageContext(
  message: UIMessage,
  currentTurnId: string,
  responseMessageId: string,
  context: AskIrisConversationContext,
): string | null {
  return message.id === currentTurnId || message.id === responseMessageId
    ? serializeContext(context)
    : null;
}

export async function saveAskIrisConversationTurn(
  db: D1Database,
  input: {
    conversationId: string;
    userId: string;
    title: string;
    messages: UIMessage[];
    currentTurnId: string;
    responseMessageId: string;
    context: AskIrisConversationContext;
    now: number;
  },
): Promise<void> {
  const conversation = await db
    .prepare("SELECT user_id FROM askiris_conversations WHERE id = ?")
    .bind(input.conversationId)
    .first<{ user_id: string }>();

  if (conversation && conversation.user_id !== input.userId) {
    throw new ConversationOwnershipError();
  }

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

  for (const [sequence, message] of input.messages.entries()) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO askiris_messages (
            id,
            conversation_id,
            role,
            sequence,
            message_json,
            context_json,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          message.id,
          input.conversationId,
          message.role,
          sequence,
          serializeMessage(message),
          getMessageContext(message, input.currentTurnId, input.responseMessageId, input.context),
          input.now,
        ),
    );
  }

  await db.batch(statements);
}

export async function importAskIrisConversation(
  db: D1Database,
  input: {
    conversationId: string;
    userId: string;
    title: string;
    messages: UIMessage[];
    context: AskIrisConversationContext;
    now: number;
  },
): Promise<void> {
  const conversation = await db
    .prepare("SELECT user_id FROM askiris_conversations WHERE id = ?")
    .bind(input.conversationId)
    .first<{ user_id: string }>();

  if (conversation && conversation.user_id !== input.userId) {
    throw new ConversationOwnershipError();
  }

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

  for (const [sequence, message] of input.messages.entries()) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO askiris_messages (
            id,
            conversation_id,
            role,
            sequence,
            message_json,
            context_json,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          message.id,
          input.conversationId,
          message.role,
          sequence,
          serializeMessage(message),
          serializeContext(input.context),
          input.now,
        ),
    );
  }

  await db.batch(statements);
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
