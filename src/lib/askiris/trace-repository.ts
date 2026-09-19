import "server-only";

export const ASKIRIS_TRACE_MAX_USER_MESSAGE_BYTES = 64 * 1024;
export const ASKIRIS_TRACE_MAX_RESPONSE_MESSAGE_BYTES = 512 * 1024;

export type AskIrisTraceStatus = "completed" | "aborted" | "error";

export interface AskIrisTraceRecord {
  /** Unique identifier for one agent execution attempt. */
  traceId: string;
  /** Stable identifier for one user turn; retries reuse it. */
  turnId: string;
  /** Groups consecutive turns in the current client-side topic. */
  segmentId: string;
  /** Lens catalogue used by this turn, such as X or G. */
  mount: string;
  /** Locale used for the request and response. */
  locale: string;
  /** Terminal outcome of the execution attempt. */
  status: AskIrisTraceStatus;
  /** Current user UIMessage, not the full message history. */
  userMessage: unknown;
  /** Ordered UIMessage identifiers supplied as context for this execution. */
  contextMessageIds: string[];
  /** Identifier extracted from the assistant UIMessage for indexed lookup. */
  responseMessageId?: string;
  /** Assistant UIMessage, including client-visible tool output. */
  responseMessage?: unknown;
  /** Provider that handled the model call. */
  modelProvider?: string;
  /** Provider-specific model identifier used for the execution. */
  modelName?: string;
  /** Cloudflare Worker Version ID serving the request. */
  releaseId?: string;
  /** Unix timestamp in milliseconds when execution began. */
  startedAt: number;
  /** Unix timestamp in milliseconds when execution ended. */
  finishedAt: number;
  /** Normalized AI SDK finish reason for the final model call. */
  finishReason?: string;
  /** Sanitized application error category; raw provider errors are not stored. */
  errorCode?: string;
  /** Provider-reported input token count for the full execution. */
  inputTokens?: number;
  /** Provider-reported output token count for the full execution. */
  outputTokens?: number;
  /** Provider-reported input tokens served from cache. */
  cacheReadTokens?: number;
  /** Provider-reported reasoning token count when available. */
  reasoningTokens?: number;
  /** Number of model-generation steps in the execution. */
  stepCount: number;
  /** Number of tool calls represented in the assistant UIMessage. */
  toolCallCount: number;
  /** Milliseconds from execution start until the first streamed output. */
  firstOutputMs?: number;
  /** Marks developer traffic that should be excluded from product analysis. */
  internal: boolean;
}

interface SerializedMessage {
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

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function truncatedMessage(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return { truncated: true };
  }

  const message = value as Record<string, unknown>;
  return {
    ...(typeof message.id === "string" ? { id: message.id } : {}),
    ...(typeof message.role === "string" ? { role: message.role } : {}),
    truncated: true,
  };
}

export function serializeTraceMessage(value: unknown, maxBytes: number): SerializedMessage {
  const json = JSON.stringify(value, jsonReplacer) ?? "null";
  if (byteLength(json) <= maxBytes) {
    return { json, truncated: false };
  }

  return {
    json: JSON.stringify(truncatedMessage(value)),
    truncated: true,
  };
}

export function workerReleaseId(
  metadata: Pick<WorkerVersionMetadata, "id"> | undefined,
): string | undefined {
  return metadata?.id || undefined;
}

export async function writeAskIrisTrace(
  db: D1Database,
  record: AskIrisTraceRecord,
): Promise<void> {
  const userMessage = serializeTraceMessage(
    record.userMessage,
    ASKIRIS_TRACE_MAX_USER_MESSAGE_BYTES,
  );
  const responseMessage =
    record.responseMessage === undefined
      ? undefined
      : serializeTraceMessage(
          record.responseMessage,
          ASKIRIS_TRACE_MAX_RESPONSE_MESSAGE_BYTES,
        );

  await db
    .prepare(
      `INSERT INTO askiris_traces (
        trace_id,
        turn_id,
        segment_id,
        mount,
        locale,
        status,
        user_message_json,
        context_message_ids_json,
        response_message_id,
        response_message_json,
        content_truncated,
        model_provider,
        model_name,
        release_id,
        started_at,
        finished_at,
        finish_reason,
        error_code,
        input_tokens,
        output_tokens,
        cache_read_tokens,
        reasoning_tokens,
        step_count,
        tool_call_count,
        first_output_ms,
        internal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.traceId,
      record.turnId,
      record.segmentId,
      record.mount,
      record.locale,
      record.status,
      userMessage.json,
      JSON.stringify(record.contextMessageIds),
      record.responseMessageId ?? null,
      responseMessage?.json ?? null,
      userMessage.truncated || responseMessage?.truncated ? 1 : 0,
      record.modelProvider ?? null,
      record.modelName ?? null,
      record.releaseId ?? null,
      record.startedAt,
      record.finishedAt,
      record.finishReason ?? null,
      record.errorCode ?? null,
      record.inputTokens ?? null,
      record.outputTokens ?? null,
      record.cacheReadTokens ?? null,
      record.reasoningTokens ?? null,
      record.stepCount,
      record.toolCallCount,
      record.firstOutputMs ?? null,
      record.internal ? 1 : 0,
    )
    .run();
}
