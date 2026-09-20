import type { UIMessage } from "ai";

/** Returns the user message that starts the turn for an assistant response. */
export function findTurnIdForResponse(
  messages: UIMessage[],
  responseIndex: number,
): string | null {
  for (let i = responseIndex - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return messages[i].id;
    }
  }
  return null;
}
