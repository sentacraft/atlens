import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { LensReviewSource } from "@/lib/lens/reviews";

/** What a citation marker and its card show of a review source. */
export type CitedReviewSource = Pick<LensReviewSource, "id" | "url" | "site" | "kind" | "published" | "bodies">;

/** A review source with the number its markers carry. */
export interface CitedSource {
  number: number;
  key: string;
  source: CitedReviewSource;
}

/** The numbered sources of one Iris reply, or of one lens page's review section. */
export interface Citations {
  byKey: Map<string, CitedSource>;
  /** Every cited source, in marker order. */
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
export function messageCitations(messages: UIMessage[], index: number): Citations {
  const known = new Map<string, LensReviewSource>();
  for (const message of messages.slice(0, index + 1)) {
    for (const [key, source] of fetchedSources(message)) {
      known.set(key, source);
    }
  }
  const message = messages[index];
  const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n");
  const cited = [...text.matchAll(SOURCE_LINK_RE)].map((match) => match[1]);
  return numberSources([...new Set(cited)], [...known.values()]);
}

/** The month a source was published, from its `YYYY-MM` or `YYYY-MM-DD` date; undefined for anything else. */
export function publishedMonth(published: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(published);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : undefined;
}

/** The source's own page, or undefined for anything but an http(s) URL. */
export function sourceHref(source: CitedReviewSource): string | undefined {
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Numbers sources in the given order; ids with no matching source are skipped. */
export function numberSources(order: string[], sources: CitedReviewSource[]): Citations {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const list = order
    .filter((id) => byId.has(id))
    .map((id, i) => ({ number: i + 1, key: id, source: byId.get(id)! }));
  return { byKey: new Map(list.map((entry) => [entry.key, entry])), list };
}
