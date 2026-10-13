import type { UIMessage } from "ai";

export type ResolvedTurn<MESSAGE extends UIMessage> =
  | {
      kind: "new" | "regenerate";
      history: MESSAGE[];
      userMessage: MESSAGE;
      historyChanged: boolean;
    }
  | { kind: "invalid" };

/**
 * Places the client's message on the stored history. A user message that is already
 * stored is a regenerate: the history ends at it, and the stored copy is used.
 * `historyChanged` is set when the message the client saw before this one is not
 * the stored one, so the client knows to reload the conversation.
 */
export function resolveTurn<MESSAGE extends UIMessage>(
  stored: MESSAGE[],
  incoming: MESSAGE,
  previousMessageId: string | null,
): ResolvedTurn<MESSAGE> {
  if (incoming.role !== "user") {
    return { kind: "invalid" };
  }
  const index = stored.findIndex((message) => message.id === incoming.id);
  if (index === -1) {
    return {
      kind: "new",
      history: [...stored, incoming],
      userMessage: incoming,
      historyChanged: (stored.at(-1)?.id ?? null) !== previousMessageId,
    };
  }
  const userMessage = stored[index];
  if (userMessage.role !== "user") {
    return { kind: "invalid" };
  }
  return {
    kind: "regenerate",
    history: stored.slice(0, index + 1),
    userMessage,
    historyChanged: (stored[index - 1]?.id ?? null) !== previousMessageId,
  };
}
