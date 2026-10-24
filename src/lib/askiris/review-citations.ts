import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { LensReviewSource } from "@/lib/lens/reviews";

/** A review source as one message shows it: its marker number, and the source itself. */
export interface CitedSource {
  number: number;
  key: string;
  source: LensReviewSource;
}

export interface MessageCitations {
  byKey: Map<string, CitedSource>;
  /** Every source the message cites, in marker order. */
  list: CitedSource[];
}

/** The label of a source link that is only a marker; the system prompt asks Iris to write it. */
export const SOURCE_MARKER_LABEL = "^";

const SOURCE_LINK_RE = /\]\(source:([^)\s]+)\)/g;

// Read loosely: stored turns are replayed even when they no longer match the tool schemas.
function fetchedSources(message: UIMessage): Map<string, LensReviewSource> {
  const sources = new Map<string, LensReviewSource>();
  for (const part of message.parts) {
    if (!isToolUIPart(part) || getToolName(part) !== "lensReviews" || part.state !== "output-available") {
      continue;
    }
    const output = part.output as { lenses?: { sources?: LensReviewSource[] }[] } | undefined;
    for (const lens of output?.lenses ?? []) {
      for (const source of lens.sources ?? []) {
        if (typeof source?.id === "string" && typeof source.site === "string") {
          sources.set(source.id, source);
        }
      }
    }
  }
  return sources;
}

/**
 * Numbers the review sources `messages[index]` cites, in order of first citation. A citation
 * resolves against any review the conversation fetched up to that message; one that resolves
 * nowhere gets no number. Sources fetched but never cited are left out: listing them would
 * attribute the reply to reviews it may not have used.
 */
export function messageCitations(messages: UIMessage[], index: number): MessageCitations {
  const known = new Map<string, LensReviewSource>();
  for (const message of messages.slice(0, index + 1)) {
    for (const [key, source] of fetchedSources(message)) {
      known.set(key, source);
    }
  }
  const message = messages[index];
  const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n");
  const cited = [...text.matchAll(SOURCE_LINK_RE)].map((match) => match[1]);
  const keys = [...new Set(cited)].filter((key) => known.has(key));
  const list = keys.map((key, i) => ({ number: i + 1, key, source: known.get(key)! }));
  return { byKey: new Map(list.map((entry) => [entry.key, entry])), list };
}

/** The source's own page, or undefined for anything but an http(s) URL. */
export function sourceHref(source: LensReviewSource): string | undefined {
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
