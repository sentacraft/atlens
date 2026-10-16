import { queryOptions } from "@tanstack/react-query";
import type { ChatLinkTargets } from "@/lib/askiris/inline-links";
import type { LensSummary } from "@/lib/lens/data";

const ENDPOINT = "/api/askiris/chat-data";

/** What a chat needs beyond the conversation: link targets and the lenses the gear card searches. */
export interface AskIrisChatData {
  linkTargets: ChatLinkTargets;
  lenses: LensSummary[];
}

export function askIrisChatDataQuery(locale: string) {
  return queryOptions({
    queryKey: ["askiris", "chat-data", locale],
    queryFn: async (): Promise<AskIrisChatData> => {
      const response = await fetch(`${ENDPOINT}?${new URLSearchParams({ locale })}`);
      if (!response.ok) {
        throw new Error(`chat_data_${response.status}`);
      }
      return (await response.json()) as AskIrisChatData;
    },
    staleTime: Infinity,
  });
}
