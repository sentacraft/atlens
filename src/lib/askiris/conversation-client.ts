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

// "unavailable" covers a deleted conversation, one owned by another user (both 404 by
// design), and a signed-out visitor (401): none of them can be shown.
export async function fetchConversationMessages(
  conversationId: string,
): Promise<AskIrisUIMessage[] | "unavailable"> {
  const response = await fetch(
    `/api/askiris/conversations/${encodeURIComponent(conversationId)}`,
    { cache: "no-store" },
  );
  if (response.status === 404 || response.status === 401) {
    return "unavailable";
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
