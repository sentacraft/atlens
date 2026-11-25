import type { UIMessage } from "ai";

const REVIEW_SEARCH_LINK = /\]\(reviews:/;

/** Whether an earlier reply in the conversation already offered other sites' review searches. */
export function reviewSearchOffered(messages: UIMessage[]): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      message.parts.some((part) => part.type === "text" && REVIEW_SEARCH_LINK.test(part.text)),
  );
}
