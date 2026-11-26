import type { UIMessage } from "ai";
import { normalizeRefListLinks } from "@/lib/ai/lens-ref";

const REVIEW_SEARCH_LINK = /\]\(reviews:([^)]*)\)/g;

/** The refs earlier assistant replies already linked review searches for, in order of first appearance. */
export function offeredReviewRefs(messages: UIMessage[]): string[] {
  const refs = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const part of message.parts) {
      if (part.type !== "text") {
        continue;
      }
      for (const match of normalizeRefListLinks(part.text).matchAll(REVIEW_SEARCH_LINK)) {
        for (const ref of match[1].split(",")) {
          if (ref) {
            refs.add(ref);
          }
        }
      }
    }
  }
  return [...refs];
}
