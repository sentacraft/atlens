import { getToolName, isToolUIPart, type UIMessage } from "ai";

export type ResolvedTurn<MESSAGE extends UIMessage> =
  | {
      kind: "new" | "regenerate" | "tool-result";
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
  clientTools: readonly string[] = [],
): ResolvedTurn<MESSAGE> {
  if (incoming.role === "assistant") {
    return resolveToolResult(stored, incoming, previousMessageId, clientTools);
  }
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

/**
 * A client tool's output arriving on the stored response that asked for it. Only outputs
 * for that response's pending client-tool calls are taken from the client; everything
 * else comes from the stored copy.
 */
function resolveToolResult<MESSAGE extends UIMessage>(
  stored: MESSAGE[],
  incoming: MESSAGE,
  previousMessageId: string | null,
  clientTools: readonly string[],
): ResolvedTurn<MESSAGE> {
  const response = stored.at(-1);
  const userMessage = stored.findLast((message) => message.role === "user");
  if (!response || response.role !== "assistant" || response.id !== incoming.id || !userMessage) {
    return { kind: "invalid" };
  }
  const outputs = new Map<string, unknown>();
  for (const part of incoming.parts) {
    if (isToolUIPart(part) && part.state === "output-available") {
      outputs.set(part.toolCallId, part.output);
    }
  }
  let answered = 0;
  const parts = response.parts.map((part) => {
    if (
      isToolUIPart(part) &&
      part.state === "input-available" &&
      clientTools.includes(getToolName(part)) &&
      outputs.has(part.toolCallId)
    ) {
      answered++;
      return { ...part, state: "output-available", output: outputs.get(part.toolCallId) };
    }
    return part;
  });
  if (answered === 0) {
    return { kind: "invalid" };
  }
  return {
    kind: "tool-result",
    history: [...stored.slice(0, -1), { ...response, parts } as MESSAGE],
    userMessage,
    historyChanged: (stored.at(-2)?.id ?? null) !== previousMessageId,
  };
}
