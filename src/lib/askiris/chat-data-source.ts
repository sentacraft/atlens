import "server-only";
import { getLensLinkIndex } from "@/lib/ai/lens-link-index";
import type { AskIrisChatData } from "@/lib/askiris/chat-data";
import { BRANDS } from "@/lib/brands";
import { COLLECTIONS } from "@/lib/collections";
import { getLensSummaries } from "@/lib/lens/data";

/** What a chat needs beyond the conversation, in one locale. It changes only with a deploy. */
export function buildAskIrisChatData(locale: string): AskIrisChatData {
  return {
    linkTargets: { lenses: getLensLinkIndex(locale), collections: Object.keys(COLLECTIONS), brands: BRANDS.map((b) => b.slug) },
    lenses: getLensSummaries(locale),
  };
}
