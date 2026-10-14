import { queryOptions } from "@tanstack/react-query";
import type { AskIrisConversationRecord } from "@/lib/askiris/conversation-repository";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

// Keyed by user: the cache outlives a sign-out.
export function conversationListQueryKey(userId: string) {
  return ["askiris", "conversations", userId] as const;
}

export async function fetchConversationList(): Promise<AskIrisConversationRecord[]> {
  const response = await fetch("/api/askiris/conversations", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`conversation_list_${response.status}`);
  }
  const data = (await response.json()) as { conversations: AskIrisConversationRecord[] };
  return data.conversations;
}

// Always refetched: a cached copy would miss the turns saved since.
export function conversationMessagesQuery(conversationId: string) {
  return queryOptions({
    queryKey: ["askiris", "conversation", conversationId],
    queryFn: () => fetchConversationMessages(conversationId),
    staleTime: 0,
    retry: false,
  });
}

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
