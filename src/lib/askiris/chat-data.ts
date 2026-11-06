import { queryOptions } from "@tanstack/react-query";
import type { Locale } from "@/i18n/routing";
import type { ChatLinkTargets } from "@/lib/askiris/inline-links";
import type { LensSummary } from "@/lib/lens/data";

/** What a chat needs beyond the conversation: link targets and the lenses the gear card searches. */
export interface AskIrisChatData {
  linkTargets: ChatLinkTargets;
  lenses: LensSummary[];
}

// Written before dev, build, typecheck and test by scripts/build-askiris-chat-data.mts.
const LOADERS: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("@/data/askiris-chat-data.en.generated.json"),
  zh: () => import("@/data/askiris-chat-data.zh.generated.json"),
};

export function askIrisChatDataQuery(locale: string) {
  return queryOptions({
    queryKey: ["askiris", "chat-data", locale],
    queryFn: async (): Promise<AskIrisChatData> => {
      const load = LOADERS[locale as Locale];
      if (!load) {
        throw new Error(`chat_data_locale_${locale}`);
      }
      return (await load()).default as AskIrisChatData;
    },
    staleTime: Infinity,
  });
}
