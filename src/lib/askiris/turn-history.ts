import { getToolName, isToolUIPart, type UIMessage } from "ai";

export type ResolvedTurn<MESSAGE extends UIMessage> =
  | {
      kind: "new" | "regenerate" | "tool-result";
      history: MESSAGE[];
      userMessage: MESSAGE;
      historyChanged: boolean;
    }
  | { kind: "invalid" };

/** What the user may answer on a paused response: client tools, and the approval a gated tool waits for. */
export interface Answerable {
  clientTools: readonly string[];
  approvalTools: readonly string[];
  /** Stands in for any reason the client sends with a denial, which would reach the model. */
  deniedReason: string;
}

const NOTHING_ANSWERABLE: Answerable = { clientTools: [], approvalTools: [], deniedReason: "" };

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
  answerable: Answerable = NOTHING_ANSWERABLE,
): ResolvedTurn<MESSAGE> {
  if (incoming.role === "assistant") {
    return resolveToolResult(stored, incoming, previousMessageId, answerable);
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
 * The user's answer arriving on the stored response that paused for it: a client tool's
 * output, or whether a gated tool may run. Only answers to that response's pending calls are
 * taken from the client, and of an approval only its yes or no; everything else comes from
 * the stored copy.
 */
function resolveToolResult<MESSAGE extends UIMessage>(
  stored: MESSAGE[],
  incoming: MESSAGE,
  previousMessageId: string | null,
  { clientTools, approvalTools, deniedReason }: Answerable,
): ResolvedTurn<MESSAGE> {
  const response = stored.at(-1);
  const userMessage = stored.findLast((message) => message.role === "user");
  if (!response || response.role !== "assistant" || response.id !== incoming.id || !userMessage) {
    return { kind: "invalid" };
  }
  const outputs = new Map<string, unknown>();
  const approvals = new Map<string, boolean>();
  for (const part of incoming.parts) {
    if (isToolUIPart(part) && part.state === "output-available") {
      outputs.set(part.toolCallId, part.output);
    }
    if (isToolUIPart(part) && part.state === "approval-responded") {
      approvals.set(part.approval.id, part.approval.approved);
    }
  }
  let answered = 0;
  const parts = response.parts.map((part) => {
    if (!isToolUIPart(part)) {
      return part;
    }
    if (part.state === "input-available" && clientTools.includes(getToolName(part)) && outputs.has(part.toolCallId)) {
      answered++;
      return { ...part, state: "output-available", output: outputs.get(part.toolCallId) };
    }
    const approved = part.state === "approval-requested" ? approvals.get(part.approval.id) : undefined;
    if (approved !== undefined && approvalTools.includes(getToolName(part))) {
      answered++;
      return {
        ...part,
        state: "approval-responded",
        approval: { ...part.approval, approved, ...(approved ? {} : { reason: deniedReason }) },
      };
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
