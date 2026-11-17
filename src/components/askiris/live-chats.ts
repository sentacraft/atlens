"use client";

import { Chat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ASK_TO_SIGN_IN, type SignInOutput } from "@/lib/ai/sign-in-request";
import { ASK_FOR_GEAR } from "@/lib/ai/gear-request";
import { ASK_CHOICES } from "@/lib/ai/choice-request";
import { normalizeLegacyGearCalls } from "@/lib/askiris/legacy-gear-call";
import { askIrisChatRequestBody } from "@/lib/askiris/chat-request";
import { askIrisMessageMetadataSchema, type AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { MODEL_PRESET_HEADER } from "@/lib/ai/model-presets";

let modelPreset: string | undefined;

/** Development only: the Test Hook model preset sent with each turn, or undefined for the default. */
export function setModelPreset(id: string | undefined) {
  modelPreset = id;
}

const transport = new DefaultChatTransport<AskIrisUIMessage>({
  prepareSendMessagesRequest: ({ id, messages, body, headers }) => ({
    body: askIrisChatRequestBody({ id, messages, body }),
    headers: modelPreset ? { ...headers, [MODEL_PRESET_HEADER]: modelPreset } : headers,
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

function hasPendingCard(messages: AskIrisUIMessage[]) {
  return messages.at(-1)?.parts.some((part) => isToolUIPart(part) && part.state === "input-available" &&
    [ASK_TO_SIGN_IN, ASK_FOR_GEAR, ASK_CHOICES].includes(getToolName(part))) ?? false;
}

function hasLocalSignInAnswer(chat: Chat<AskIrisUIMessage>, seed: AskIrisUIMessage[]) {
  const answered = answeredSignIns.get(chat);
  if (!answered) {return false;}
  const stored = normalizeLegacyGearCalls(seed);
  return chat.messages.some((message) => message.parts.some((part) =>
    isToolUIPart(part) && getToolName(part) === ASK_TO_SIGN_IN && part.state === "output-available" && answered.has(part.toolCallId) &&
    !stored.find((item) => item.id === message.id)?.parts.some((saved) =>
      isToolUIPart(saved) && getToolName(saved) === ASK_TO_SIGN_IN && saved.toolCallId === part.toolCallId &&
      (saved.state === "output-available" || saved.state === "output-error" || saved.state === "output-denied"),
    ),
  ));
}

const answeredSignIns = new WeakMap<Chat<AskIrisUIMessage>, Set<string>>();

/** A remounted sign-in card must not submit the same completion twice. */
export function completeSignIn(chat: Chat<AskIrisUIMessage>, toolCallId: string, output: SignInOutput, body: Record<string, unknown>) {
  const pending = chat.messages.at(-1)?.parts.some((part) => isToolUIPart(part) && getToolName(part) === ASK_TO_SIGN_IN &&
    part.toolCallId === toolCallId && part.state === "input-available");
  const answered = answeredSignIns.get(chat) ?? new Set<string>();
  if (!pending || answered.has(toolCallId)) {return;}
  answered.add(toolCallId);
  answeredSignIns.set(chat, answered);
  void chat.addToolOutput({ tool: ASK_TO_SIGN_IN, toolCallId, output, options: { body } });
}

export function retryChat(chat: Chat<AskIrisUIMessage>, body: Record<string, unknown>) {
  const last = chat.messages.at(-1);
  const hasSignInAnswer = last?.role === "assistant" && last.parts.some((part) =>
    isToolUIPart(part) && getToolName(part) === ASK_TO_SIGN_IN && part.state === "output-available",
  );
  // Regeneration removes the assistant message, including the user's sign-in decision.
  return hasSignInAnswer ? chat.sendMessage(undefined, { body }) : chat.regenerate({ body });
}

let lastConversationId: string | undefined;

/** Records the conversation last shown with messages in this tab, which Iris picks up on opening. */
export function rememberConversation(id: string) {
  lastConversationId = id;
}

/** Drops a deleted conversation, so no opening picks it up. */
export function forgetConversation(id: string) {
  if (lastConversationId === id) {
    lastConversationId = undefined;
  }
}

export function rememberedConversationId(): string | undefined {
  return lastConversationId;
}

/**
 * The conversation still replying in this tab, if any. Opening the Ask Iris page with nothing to
 * hand in shows it rather than a new conversation, as reopening the panel does.
 */
export function replyingConversationId(): string | undefined {
  for (const [id, entry] of entries) {
    if (isReplying(entry.chat)) {
      return id;
    }
  }
  return undefined;
}

/** The chat for a conversation shown from `seed`: the one replying, else a new one. */
export function openChat(id: string, seed: AskIrisUIMessage[]): Chat<AskIrisUIMessage> {
  // Module state outlives a request on the server; only the browser tab keeps chats.
  if (typeof window === "undefined") {
    return createChat(id, seed);
  }
  const existing = entries.get(id);
  if (existing && (existing.seed === seed || isReplying(existing.chat) || (hasPendingCard(existing.chat.messages) && hasPendingCard(normalizeLegacyGearCalls(seed)) && existing.chat.messages.at(-1)?.id === seed.at(-1)?.id) || hasLocalSignInAnswer(existing.chat, seed))) {
    existing.seed = seed;
    return existing.chat;
  }
  for (const [key, entry] of entries) {
    if (!isReplying(entry.chat) && !hasPendingCard(entry.chat.messages) && !hasLocalSignInAnswer(entry.chat, entry.seed)) {
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
    messages: normalizeLegacyGearCalls(seed),
    transport,
    generateId: () => crypto.randomUUID(),
    messageMetadataSchema: askIrisMessageMetadataSchema,
    // The answer to a card the turn paused on goes straight back to Iris, which carries on.
    sendAutomaticallyWhen: (options) =>
      lastAssistantMessageIsCompleteWithToolCalls(options) || lastAssistantMessageIsCompleteWithApprovalResponses(options),
  });
}
