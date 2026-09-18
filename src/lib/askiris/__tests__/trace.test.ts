import { describe, expect, it, vi } from "vitest";
import {
  summarizeAskIrisStep,
  traceTurnId,
  writeAskIrisTrace,
  type AskIrisTraceRecord,
} from "../trace";

describe("traceTurnId", () => {
  it("reuses the latest user message id for retries", () => {
    expect(
      traceTurnId([
        { role: "user", id: "first" },
        { role: "assistant", id: "answer" },
        { role: "user", id: "second" },
      ]),
    ).toBe("second");
  });

  it("generates an id when the client did not provide one", () => {
    expect(traceTurnId([{ role: "user", content: "hello" }])).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });
});

describe("summarizeAskIrisStep", () => {
  it("keeps evaluation fields and drops provider request internals", () => {
    expect(
      summarizeAskIrisStep({
        stepNumber: 0,
        model: { modelId: "test" },
        text: "answer",
        toolCalls: [{ toolName: "queryLenses" }],
        request: { headers: { authorization: "secret" } },
      }),
    ).toEqual({
      stepNumber: 0,
      callId: undefined,
      model: { modelId: "test" },
      text: "answer",
      reasoningText: undefined,
      toolCalls: [{ toolName: "queryLenses" }],
      toolResults: undefined,
      finishReason: undefined,
      rawFinishReason: undefined,
      usage: undefined,
      performance: undefined,
    });
  });
});

describe("writeAskIrisTrace", () => {
  it("writes the versioned row and serialized payload", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;
    const record: AskIrisTraceRecord = {
      traceId: "trace-1",
      turnId: "turn-1",
      segmentId: "segment-1",
      mount: "X",
      locale: "en",
      status: "completed",
      startedAt: "2026-09-18T00:00:00.000Z",
      finishedAt: "2026-09-18T00:00:01.000Z",
      modelProvider: "test-provider",
      modelId: "test-model",
      finishReason: "stop",
      totalTokens: 12,
      inputTokens: 8,
      outputTokens: 4,
      cacheReadTokens: 2,
      stepCount: 1,
      internal: false,
      payload: {
        inputMessages: [{ role: "user", content: "hello" }],
        steps: [],
      },
    };

    await writeAskIrisTrace(db, record);

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("trace_id"));
    expect(bind).toHaveBeenCalledWith(
      "trace-1",
      "turn-1",
      "segment-1",
      "X",
      "en",
      "completed",
      "2026-09-18T00:00:00.000Z",
      "2026-09-18T00:00:01.000Z",
      "test-provider",
      "test-model",
      "stop",
      12,
      8,
      4,
      2,
      1,
      0,
      1,
      JSON.stringify(record.payload),
    );
    expect(run).toHaveBeenCalledOnce();
  });
});
