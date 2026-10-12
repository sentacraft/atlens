import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export const CONVERSATION_PARAM = "conversation";

export async function fetchConversationList(): Promise<ConversationSummary[]> {
  const response = await fetch("/api/askiris/conversations", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`conversation_list_${response.status}`);
  }
  const data = (await response.json()) as { conversations: ConversationSummary[] };
  return data.conversations;
}

// "not_found" covers both a deleted conversation and one owned by another user; the
// endpoint deliberately answers both with 404.
export async function fetchConversationMessages(
  conversationId: string,
): Promise<AskIrisUIMessage[] | "not_found"> {
  const response = await fetch(
    `/api/askiris/conversations/${encodeURIComponent(conversationId)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) {
    return "not_found";
  }
  if (!response.ok) {
    throw new Error(`conversation_load_${response.status}`);
  }
  const data = (await response.json()) as { messages: Array<{ message: AskIrisUIMessage }> };
  return data.messages.map((item) => item.message);
}

export function readConversationParam(): string | null {
  return new URL(window.location.href).searchParams.get(CONVERSATION_PARAM) || null;
}

// "push" for user-initiated switches, so Back returns to the previous conversation;
// "replace" for bookkeeping that must not add a history entry.
export function writeConversationParam(
  conversationId: string | null,
  mode: "push" | "replace",
): void {
  const url = new URL(window.location.href);
  if ((url.searchParams.get(CONVERSATION_PARAM) || null) === conversationId) {
    return;
  }
  if (conversationId) {
    url.searchParams.set(CONVERSATION_PARAM, conversationId);
  } else {
    url.searchParams.delete(CONVERSATION_PARAM);
  }
  if (mode === "push") {
    window.history.pushState(null, "", url.toString());
  } else {
    window.history.replaceState(null, "", url.toString());
  }
}
