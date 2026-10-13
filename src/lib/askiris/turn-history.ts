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

function isToolPart(part: UIMessage["parts"][number]): part is Extract<
  UIMessage["parts"][number],
  { state: string; toolCallId: string }
> {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

/**
 * The response as it can be stored and replayed to the model. A stopped turn can end
 * mid tool call, and a call with no result cannot be converted back into model
 * messages, so unfinished calls are dropped. Undefined when nothing is left to keep.
 */
export function storableResponse<MESSAGE extends UIMessage>(
  message: MESSAGE,
): MESSAGE | undefined {
  const parts = message.parts.filter(
    (part) =>
      !isToolPart(part) || part.state === "output-available" || part.state === "output-error",
  );
  if (!parts.some((part) => part.type !== "step-start")) {
    return undefined;
  }
  return { ...message, parts };
}
