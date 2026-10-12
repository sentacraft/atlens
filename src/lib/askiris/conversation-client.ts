import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// Scoped by user: the query cache outlives a sign-out, so a second account in the
// same tab must never be served the first one's list.
export function conversationListQueryKey(userId: string) {
  return ["askiris", "conversations", userId] as const;
}

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
