import type { SearchName } from "@/lib/types";
import { searchNameFor } from "@/lib/lens/lens";

export type ReviewSearchChannel = "bilibili" | "youtube" | "bing" | "google" | "flickr" | "reddit";
export type ReviewSearchKind = "video" | "article" | "photos" | "discussion";

export interface ReviewSearchLink {
  channel: ReviewSearchChannel;
  kind: ReviewSearchKind;
  url: string;
}

const KIND: Record<ReviewSearchChannel, ReviewSearchKind> = {
  bilibili: "video",
  youtube: "video",
  bing: "article",
  google: "article",
  flickr: "photos",
  reddit: "discussion",
};

// Google is unreachable from mainland China, so the Chinese page searches articles on Bing, whose
// www host sends each visitor to their regional site.
const CHANNELS: Record<string, ReviewSearchChannel[]> = {
  zh: ["bilibili", "youtube", "bing", "flickr"],
  en: ["youtube", "google", "flickr", "reddit"],
};

/** The sites a page in this language searches, in the order it lists them. */
export function reviewSearchChannels(locale: string): ReviewSearchChannel[] {
  return CHANNELS[locale] ?? CHANNELS.en;
}

/**
 * Search links for other sites' reviews, sample photos and community discussions of a lens. The
 * results are each site's own; nothing here is chosen or ranked by us.
 */
export function buildReviewSearchLinks({
  names,
  locale,
  reviewKeyword,
}: {
  /** The lens's review search names (`searchAliases.review`). */
  names: SearchName;
  locale: string;
  /** "review" in the page language, appended to video and article searches. */
  reviewKeyword: string;
}): ReviewSearchLink[] {
  const name = searchNameFor(names, locale);
  const english = names.en;
  const review = encodeURIComponent(`${name} ${reviewKeyword}`);
  const url: Record<ReviewSearchChannel, () => string> = {
    bilibili: () => `https://search.bilibili.com/all?keyword=${review}`,
    youtube: () => `https://www.youtube.com/results?search_query=${review}`,
    bing: () => `https://www.bing.com/search?q=${review}`,
    google: () => `https://www.google.com/search?q=${review}`,
    // Flickr titles and tags are mostly English.
    flickr: () => `https://www.flickr.com/search/?text=${encodeURIComponent(english)}`,
    reddit: () => `https://www.reddit.com/r/fujifilm/search/?q=${encodeURIComponent(name)}`,
  };
  return reviewSearchChannels(locale).map((channel) => ({ channel, kind: KIND[channel], url: url[channel]() }));
}
