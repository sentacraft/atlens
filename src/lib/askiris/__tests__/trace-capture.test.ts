import { describe, expect, it } from "vitest";
import type { LanguageModelUsage, UIMessage } from "ai";
import { AskIrisTraceCollector, traceMessageContext } from "../trace-capture";

function usage(overrides: Partial<LanguageModelUsage> = {}): LanguageModelUsage {
  return {
    inputTokens: undefined,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens: undefined,
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
    totalTokens: undefined,
    ...overrides,
  };
}

describe("traceMessageContext", () => {
  it("uses the latest user message as the stable turn and keeps context ids in order", () => {
    const messages: UIMessage[] = [
      { id: "user-1", role: "user", parts: [{ type: "text", text: "First" }] },
      { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Answer" }] },
      { id: "user-2", role: "user", parts: [{ type: "text", text: "Follow-up" }] },
    ];

    expect(traceMessageContext(messages)).toEqual({
      userMessage: messages[2],
      turnId: "user-2",
      contextMessageIds: ["user-1", "assistant-1", "user-2"],
    });
  });

  it("does not invent a turn id when no user message exists", () => {
    expect(
      traceMessageContext([
        { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Answer" }] },
      ]),
    ).toBeUndefined();
  });
});

describe("AskIrisTraceCollector", () => {
  it("combines generation metrics with the final UI message", () => {
    let now = 1_100;
    const collector = new AskIrisTraceCollector(1_000, () => now);
    collector.recordChunk({ type: "start" });
    now = 1_250;
    collector.recordChunk({ type: "text-delta" });
    collector.recordGenerationEnd({
      usage: usage({
        inputTokens: 220,
        inputTokenDetails: {
          noCacheTokens: 40,
          cacheReadTokens: 180,
          cacheWriteTokens: undefined,
        },
        outputTokens: 30,
        outputTokenDetails: { textTokens: 25, reasoningTokens: 5 },
      }),
      stepNumber: 1,
      finishReason: "stop",
    });
    const responseMessage = {
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "text", text: "Checking" },
        {
          type: "tool-findLenses",
          toolCallId: "call-1",
          state: "output-available",
          input: {},
          output: [],
        },
        {
          type: "dynamic-tool",
          toolName: "compare",
          toolCallId: "call-2",
          state: "output-available",
          input: {},
          output: {},
        },
      ],
    } as UIMessage;

    expect(
      collector.finalizeStream({ responseMessage, isAborted: false, finishReason: "stop" }),
    ).toEqual({
      status: "completed",
      responseMessage,
      finishReason: "stop",
      errorCode: undefined,
      inputTokens: 220,
      outputTokens: 30,
      cacheReadTokens: 180,
      reasoningTokens: 5,
      stepCount: 2,
      toolCallCount: 2,
      firstOutputMs: 250,
    });
  });

  it("keeps completed-step usage when a stream is aborted", () => {
    const collector = new AskIrisTraceCollector(1_000);
    collector.recordStep({
      usage: usage({ inputTokens: 100, outputTokens: 10 }),
      stepNumber: 0,
      finishReason: "tool-calls",
    });
    collector.recordStep({
      usage: usage({ inputTokens: 120, outputTokens: 20 }),
      stepNumber: 1,
      finishReason: "stop",
    });
    collector.recordAbort();

    expect(
      collector.finalizeStream({
        responseMessage: { id: "assistant-1", role: "assistant", parts: [] },
        isAborted: false,
      }),
    ).toMatchObject({
      status: "aborted",
      inputTokens: 220,
      outputTokens: 30,
      stepCount: 2,
    });
  });

  it("logs an error once and finalizes once", () => {
    const collector = new AskIrisTraceCollector(1_000);

    expect(collector.recordError()).toBe(true);
    expect(collector.recordError()).toBe(false);
    expect(
      collector.finalizeStream({
        responseMessage: { id: "assistant-1", role: "assistant", parts: [] },
        isAborted: false,
      }),
    ).toMatchObject({
      status: "error",
      errorCode: "stream_failed",
    });
    expect(collector.finalizeError("another_error")).toBeUndefined();
  });
});
