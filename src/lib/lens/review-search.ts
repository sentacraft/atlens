import type { Lens } from "@/lib/types";
import { lensSearchQuery } from "@/lib/lens/lens";

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

/**
 * Search links for other sites' reviews, sample photos and owner discussions of a lens. The
 * results are each site's own; nothing here is chosen or ranked by us.
 */
export function buildReviewSearchLinks({
  lens,
  locale,
  brandName,
  reviewKeyword,
}: {
  lens: Lens;
  locale: string;
  /** The brand in English: Flickr titles and tags are mostly English. */
  brandName: string;
  /** "review" in the page language, appended to video and article searches. */
  reviewKeyword: string;
}): ReviewSearchLink[] {
  const name = lensSearchQuery(lens, locale);
  const review = encodeURIComponent(`${name} ${reviewKeyword}`);
  const url: Record<ReviewSearchChannel, () => string> = {
    bilibili: () => `https://search.bilibili.com/all?keyword=${review}`,
    youtube: () => `https://www.youtube.com/results?search_query=${review}`,
    bing: () => `https://www.bing.com/search?q=${review}`,
    google: () => `https://www.google.com/search?q=${review}`,
    // Store aliases end in a mount suffix ("Fuji X") that few photo titles carry.
    flickr: () => `https://www.flickr.com/search/?text=${encodeURIComponent(`${brandName} ${lens.model}`)}`,
    reddit: () => `https://www.reddit.com/r/fujifilm/search/?q=${encodeURIComponent(name)}`,
  };
  return (CHANNELS[locale] ?? CHANNELS.en).map((channel) => ({ channel, kind: KIND[channel], url: url[channel]() }));
}
