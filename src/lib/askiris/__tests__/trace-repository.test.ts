import { describe, expect, it, vi } from "vitest";
import {
  ASKIRIS_TRACE_MAX_USER_MESSAGE_BYTES,
  serializeTraceMessage,
  workerReleaseId,
  writeAskIrisTrace,
  type AskIrisTraceRecord,
} from "../trace-repository";

function traceRecord(overrides: Partial<AskIrisTraceRecord> = {}): AskIrisTraceRecord {
  return {
    traceId: "trace-1",
    turnId: "user-message-2",
    segmentId: "segment-1",
    mount: "X",
    locale: "en",
    status: "completed",
    userMessage: {
      id: "user-message-2",
      role: "user",
      parts: [{ type: "text", text: "Which lens is lighter?" }],
    },
    contextMessageIds: ["user-message-1", "assistant-message-1", "user-message-2"],
    responseMessageId: "assistant-message-2",
    responseMessage: {
      id: "assistant-message-2",
      role: "assistant",
      parts: [{ type: "text", text: "The lighter lens is..." }],
    },
    modelProvider: "dashscope",
    modelName: "qwen3.7-plus",
    releaseId: "worker-version-1",
    startedAt: 1_800_000_000_000,
    finishedAt: 1_800_000_001_000,
    finishReason: "stop",
    inputTokens: 100,
    outputTokens: 20,
    cacheReadTokens: 80,
    reasoningTokens: 5,
    stepCount: 2,
    toolCallCount: 1,
    firstOutputMs: 250,
    internal: false,
    ...overrides,
  };
}

describe("serializeTraceMessage", () => {
  it("keeps a message that fits within the limit", () => {
    const message = { id: "message-1", role: "user", parts: [] };

    expect(serializeTraceMessage(message, 1024)).toEqual({
      json: JSON.stringify(message),
      truncated: false,
    });
  });

  it("keeps message identity when replacing oversized content", () => {
    const message = {
      id: "message-1",
      role: "user",
      parts: [{ type: "text", text: "x".repeat(ASKIRIS_TRACE_MAX_USER_MESSAGE_BYTES) }],
    };

    expect(serializeTraceMessage(message, ASKIRIS_TRACE_MAX_USER_MESSAGE_BYTES)).toEqual({
      json: JSON.stringify({ id: "message-1", role: "user", truncated: true }),
      truncated: true,
    });
  });
});

describe("workerReleaseId", () => {
  it("uses the Cloudflare Worker version id", () => {
    expect(workerReleaseId({ id: "version-1" })).toBe("version-1");
  });

  it("returns undefined outside the Workers runtime", () => {
    expect(workerReleaseId(undefined)).toBeUndefined();
  });
});

describe("writeAskIrisTrace", () => {
  it("writes one completed trace row", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;
    const record = traceRecord();

    await writeAskIrisTrace(db, record);

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("user_message_json"));
    expect(bind).toHaveBeenCalledWith(
      "trace-1",
      "user-message-2",
      "segment-1",
      "X",
      "en",
      "completed",
      JSON.stringify(record.userMessage),
      JSON.stringify(record.contextMessageIds),
      "assistant-message-2",
      JSON.stringify(record.responseMessage),
      0,
      "dashscope",
      "qwen3.7-plus",
      "worker-version-1",
      1_800_000_000_000,
      1_800_000_001_000,
      "stop",
      null,
      100,
      20,
      80,
      5,
      2,
      1,
      250,
      0,
      1,
    );
    expect(run).toHaveBeenCalledOnce();
  });

  it("allows an error trace without a response message", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;

    await writeAskIrisTrace(
      db,
      traceRecord({
        status: "error",
        responseMessageId: undefined,
        responseMessage: undefined,
        errorCode: "message_conversion_failed",
      }),
    );

    expect(bind).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "error",
      expect.anything(),
      expect.anything(),
      null,
      null,
      0,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "message_conversion_failed",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
