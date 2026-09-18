import { isToolUIPart, type LanguageModelUsage, type UIMessage } from "ai";

export interface AskIrisTraceMessageContext {
  userMessage: UIMessage;
  turnId: string;
  contextMessageIds: string[];
}

export interface AskIrisTraceUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  reasoningTokens?: number;
}

function addOptionalCounts(left: number | undefined, right: number | undefined) {
  return left === undefined && right === undefined ? undefined : (left ?? 0) + (right ?? 0);
}

export function traceMessageContext(
  messages: UIMessage[],
): AskIrisTraceMessageContext | undefined {
  const userMessage = messages.findLast(
    (message) => message.role === "user" && typeof message.id === "string" && message.id.length > 0,
  );
  if (!userMessage) {
    return undefined;
  }

  return {
    userMessage,
    turnId: userMessage.id,
    contextMessageIds: messages.flatMap((message) =>
      typeof message.id === "string" && message.id.length > 0 ? [message.id] : [],
    ),
  };
}

export function traceUsage(usage: LanguageModelUsage): AskIrisTraceUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens,
  };
}

export function addTraceUsage(
  accumulated: AskIrisTraceUsage,
  next: AskIrisTraceUsage,
): AskIrisTraceUsage {
  return {
    inputTokens: addOptionalCounts(accumulated.inputTokens, next.inputTokens),
    outputTokens: addOptionalCounts(accumulated.outputTokens, next.outputTokens),
    cacheReadTokens: addOptionalCounts(accumulated.cacheReadTokens, next.cacheReadTokens),
    reasoningTokens: addOptionalCounts(accumulated.reasoningTokens, next.reasoningTokens),
  };
}

export function countTraceToolCalls(message: UIMessage | undefined): number {
  return message?.parts.filter(isToolUIPart).length ?? 0;
}

export function isTraceOutputChunk(type: string): boolean {
  return (
    type === "text-delta" ||
    type === "reasoning-delta" ||
    type === "file" ||
    type === "reasoning-file" ||
    type === "tool-input-delta" ||
    type === "tool-call"
  );
}
