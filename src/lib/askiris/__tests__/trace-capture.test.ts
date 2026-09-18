import { describe, expect, it } from "vitest";
import type { LanguageModelUsage, UIMessage } from "ai";
import {
  addTraceUsage,
  countTraceToolCalls,
  isTraceOutputChunk,
  traceMessageContext,
  traceUsage,
} from "../trace-capture";

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

describe("trace usage", () => {
  it("maps provider usage and accumulates completed steps", () => {
    const first = traceUsage(
      usage({
        inputTokens: 100,
        inputTokenDetails: {
          noCacheTokens: 20,
          cacheReadTokens: 80,
          cacheWriteTokens: undefined,
        },
        outputTokens: 10,
      }),
    );
    const second = traceUsage(
      usage({
        inputTokens: 120,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: 100,
          cacheWriteTokens: undefined,
        },
        outputTokens: 20,
        outputTokenDetails: {
          textTokens: 15,
          reasoningTokens: 5,
        },
      }),
    );

    expect(addTraceUsage(first, second)).toEqual({
      inputTokens: 220,
      outputTokens: 30,
      cacheReadTokens: 180,
      reasoningTokens: 5,
    });
  });
});

describe("trace response capture", () => {
  it("counts static and dynamic tool parts once", () => {
    const message = {
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "text", text: "Checking" },
        { type: "tool-findLenses", toolCallId: "call-1", state: "output-available", input: {}, output: [] },
        { type: "dynamic-tool", toolName: "compare", toolCallId: "call-2", state: "output-available", input: {}, output: {} },
      ],
    } as UIMessage;

    expect(countTraceToolCalls(message)).toBe(2);
  });

  it("starts latency on generated output rather than stream bookkeeping", () => {
    expect(isTraceOutputChunk("start")).toBe(false);
    expect(isTraceOutputChunk("start-step")).toBe(false);
    expect(isTraceOutputChunk("text-delta")).toBe(true);
    expect(isTraceOutputChunk("tool-call")).toBe(true);
  });
});
