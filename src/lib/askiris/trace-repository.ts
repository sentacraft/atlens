import "server-only";

export const ASKIRIS_TRACE_MAX_USER_MESSAGE_BYTES = 64 * 1024;
export const ASKIRIS_TRACE_MAX_RESPONSE_MESSAGE_BYTES = 512 * 1024;

export type AskIrisTraceStatus = "completed" | "aborted" | "error";

export interface AskIrisTraceRecord {
  traceId: string;
  // Stable across retries of the same user turn.
  turnId: string;
  conversationId: string;
  mount: string;
  locale: string;
  status: AskIrisTraceStatus;
  // The current user message only, not the history.
  userMessage: unknown;
  contextMessageIds: string[];
  responseMessageId?: string;
  responseMessage?: unknown;
  modelProvider?: string;
  modelName?: string;
  releaseId?: string;
  // Unix ms.
  startedAt: number;
  // Unix ms.
  finishedAt: number;
  finishReason?: string;
  // Sanitized category; raw provider errors are never stored.
  errorCode?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  reasoningTokens?: number;
  stepCount: number;
  toolCallCount: number;
  firstOutputMs?: number;
  // Developer traffic, excluded from product analysis.
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
        conversation_id,
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
      record.conversationId,
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
