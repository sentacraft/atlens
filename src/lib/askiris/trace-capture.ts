import { isToolUIPart, type LanguageModelUsage, type UIMessage } from "ai";
import type { AskIrisTraceStatus } from "./trace-repository";

export interface AskIrisTraceMessageContext {
  userMessage: UIMessage;
  turnId: string;
  contextMessageIds: string[];
}

interface AskIrisTraceUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  reasoningTokens?: number;
}

interface GenerationSnapshot {
  usage: LanguageModelUsage;
  stepNumber: number;
  finishReason: string;
}

export interface AskIrisTraceCompletion extends AskIrisTraceUsage {
  status: AskIrisTraceStatus;
  responseMessage?: UIMessage;
  finishReason?: string;
  errorCode?: string;
  stepCount: number;
  toolCallCount: number;
  firstOutputMs?: number;
}

function addOptionalCounts(left: number | undefined, right: number | undefined) {
  return left === undefined && right === undefined ? undefined : (left ?? 0) + (right ?? 0);
}

function traceUsage(usage: LanguageModelUsage): AskIrisTraceUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens,
  };
}

function addTraceUsage(
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

function countTraceToolCalls(message: UIMessage | undefined): number {
  return message?.parts.filter(isToolUIPart).length ?? 0;
}

function isTraceOutputChunk(type: string): boolean {
  return (
    type === "text-delta" ||
    type === "reasoning-delta" ||
    type === "file" ||
    type === "reasoning-file" ||
    type === "tool-input-delta" ||
    type === "tool-call"
  );
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

export class AskIrisTraceCollector {
  private usage: AskIrisTraceUsage = {};
  private stepCount = 0;
  private finishReason: string | undefined;
  private firstOutputMs: number | undefined;
  private aborted = false;
  private errored = false;
  private finalized = false;

  constructor(
    private readonly startedAt: number,
    private readonly now: () => number = Date.now,
  ) {}

  recordChunk(chunk: { type: string }) {
    if (this.firstOutputMs === undefined && isTraceOutputChunk(chunk.type)) {
      this.firstOutputMs = this.now() - this.startedAt;
    }
  }

  recordStep(step: GenerationSnapshot) {
    this.usage = addTraceUsage(this.usage, traceUsage(step.usage));
    this.stepCount = Math.max(this.stepCount, step.stepNumber + 1);
    this.finishReason = step.finishReason;
  }

  recordGenerationEnd(result: GenerationSnapshot) {
    this.usage = traceUsage(result.usage);
    this.stepCount = result.stepNumber + 1;
    this.finishReason = result.finishReason;
  }

  recordAbort() {
    this.aborted = true;
  }

  /** Marks the execution errored and returns true only for the first reported error. */
  recordError(): boolean {
    const firstError = !this.errored;
    this.errored = true;
    return firstError;
  }

  finalizeStream(result: {
    responseMessage: UIMessage;
    isAborted: boolean;
    finishReason?: string;
  }): AskIrisTraceCompletion | undefined {
    const isAborted = result.isAborted || this.aborted;
    const isErrored = this.errored || result.finishReason === "error";
    return this.finalize({
      status: isAborted ? "aborted" : isErrored ? "error" : "completed",
      responseMessage: result.responseMessage,
      finishReason: result.finishReason,
      errorCode: isErrored ? "stream_failed" : undefined,
    });
  }

  finalizeError(errorCode: string): AskIrisTraceCompletion | undefined {
    return this.finalize({ status: "error", errorCode });
  }

  private finalize(
    completion: Pick<AskIrisTraceCompletion, "status" | "responseMessage" | "errorCode"> & {
      finishReason?: string;
    },
  ): AskIrisTraceCompletion | undefined {
    if (this.finalized) {
      return undefined;
    }
    this.finalized = true;

    return {
      ...completion,
      finishReason: completion.finishReason ?? this.finishReason,
      ...this.usage,
      stepCount: this.stepCount,
      toolCallCount: countTraceToolCalls(completion.responseMessage),
      firstOutputMs: this.firstOutputMs,
    };
  }
}
