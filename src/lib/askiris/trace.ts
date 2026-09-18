import "server-only";

export const ASKIRIS_TRACE_SCHEMA_VERSION = 1;
export const ASKIRIS_TRACE_MAX_PAYLOAD_BYTES = 512 * 1024;

export type AskIrisTraceStatus = "completed" | "aborted" | "error";

export interface AskIrisTraceRecord {
  traceId: string;
  turnId: string;
  segmentId: string;
  mount: string;
  locale: string;
  status: AskIrisTraceStatus;
  startedAt: string;
  finishedAt: string;
  modelProvider?: string;
  modelId?: string;
  finishReason?: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  stepCount: number;
  internal: boolean;
  payload: {
    inputMessages: unknown[];
    responseMessage?: unknown;
    steps: unknown[];
    error?: string;
  };
}

/** Keep trace payloads focused on evaluation data, not provider request internals. */
export function summarizeAskIrisStep(step: unknown): unknown {
  if (!step || typeof step !== "object") {
    return step;
  }

  const value = step as Record<string, unknown>;
  return {
    stepNumber: value.stepNumber,
    callId: value.callId,
    model: value.model,
    text: value.text,
    reasoningText: value.reasoningText,
    toolCalls: value.toolCalls,
    toolResults: value.toolResults,
    finishReason: value.finishReason,
    rawFinishReason: value.rawFinishReason,
    usage: value.usage,
    performance: value.performance,
  };
}

interface SerializedPayload {
  json: string;
  truncated: boolean;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  return value;
}

function serializedBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function serializePayload(payload: AskIrisTraceRecord["payload"]): SerializedPayload {
  let json = JSON.stringify(payload, jsonReplacer) ?? "{}";
  if (serializedBytes(json) <= ASKIRIS_TRACE_MAX_PAYLOAD_BYTES) {
    return { json, truncated: false };
  }

  const fallback = {
    inputMessages: [],
    responseMessage: undefined,
    steps: [],
    error: "trace_payload_exceeded_limit",
  };
  json = JSON.stringify(fallback);
  return { json, truncated: true };
}

export function traceTurnId(messages: unknown[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || typeof message !== "object") {
      continue;
    }
    const candidate = message as { role?: unknown; id?: unknown };
    if (candidate.role === "user" && typeof candidate.id === "string" && candidate.id.length > 0) {
      return candidate.id.slice(0, 128);
    }
  }
  return crypto.randomUUID();
}

export async function writeAskIrisTrace(
  db: D1Database,
  record: AskIrisTraceRecord,
): Promise<void> {
  const serialized = serializePayload(record.payload);
  await db
    .prepare(
      `INSERT INTO askiris_traces (
        trace_id,
        turn_id,
        segment_id,
        mount,
        locale,
        status,
        started_at,
        finished_at,
        model_provider,
        model_id,
        finish_reason,
        total_tokens,
        input_tokens,
        output_tokens,
        cache_read_tokens,
        step_count,
        internal,
        schema_version,
        payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.traceId,
      record.turnId,
      record.segmentId,
      record.mount,
      record.locale,
      record.status,
      record.startedAt,
      record.finishedAt,
      record.modelProvider ?? null,
      record.modelId ?? null,
      record.finishReason ?? null,
      record.totalTokens,
      record.inputTokens,
      record.outputTokens,
      record.cacheReadTokens,
      record.stepCount,
      record.internal ? 1 : 0,
      ASKIRIS_TRACE_SCHEMA_VERSION,
      serialized.json,
    )
    .run();
}
