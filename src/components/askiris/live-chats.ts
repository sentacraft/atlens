"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { askIrisChatRequestBody } from "@/lib/askiris/chat-request";
import { askIrisMessageMetadataSchema, type AskIrisUIMessage } from "@/lib/askiris/message-metadata";

const transport = new DefaultChatTransport<AskIrisUIMessage>({
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    body: askIrisChatRequestBody({ id, messages, body }),
  }),
});

interface Entry {
  chat: Chat<AskIrisUIMessage>;
  seed: AskIrisUIMessage[];
}

// The tab's chats by conversation id, so a second view of a conversation (the panel going
// full screen) can share its chat.
const entries = new Map<string, Entry>();

function isReplying(chat: Chat<AskIrisUIMessage>) {
  return chat.status === "submitted" || chat.status === "streaming";
}

/**
 * The conversation's chat while it is still replying in this tab. The server saves a turn
 * only when its reply ends, so until then another view must join this chat instead of loading.
 */
export function replyingChat(id: string): Chat<AskIrisUIMessage> | undefined {
  const entry = entries.get(id);
  return entry && isReplying(entry.chat) ? entry.chat : undefined;
}

/** The chat for a conversation shown from `seed`: the one replying, else a new one. */
export function openChat(id: string, seed: AskIrisUIMessage[]): Chat<AskIrisUIMessage> {
  // Module state outlives a request on the server; only the browser tab keeps chats.
  if (typeof window === "undefined") {
    return createChat(id, seed);
  }
  const existing = entries.get(id);
  if (existing && (existing.seed === seed || isReplying(existing.chat))) {
    existing.seed = seed;
    return existing.chat;
  }
  for (const [key, entry] of entries) {
    if (!isReplying(entry.chat)) {
      entries.delete(key);
    }
  }
  const chat = createChat(id, seed);
  entries.set(id, { chat, seed });
  return chat;
}

function createChat(id: string, seed: AskIrisUIMessage[]) {
  return new Chat<AskIrisUIMessage>({
    id,
    messages: seed,
    transport,
    generateId: () => crypto.randomUUID(),
    messageMetadataSchema: askIrisMessageMetadataSchema,
    // A gear card's answer goes straight back to Iris, which carries on with the reply.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
}
