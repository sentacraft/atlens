CREATE TABLE askiris_traces (
  -- Unique identifier for one agent execution attempt.
  trace_id TEXT PRIMARY KEY,
  -- Stable identifier for one user turn; retries reuse it.
  turn_id TEXT NOT NULL,
  -- Groups consecutive turns in the current client-side topic.
  segment_id TEXT NOT NULL,
  -- Lens catalogue used by this turn, such as X or G.
  mount TEXT NOT NULL,
  -- Locale used for the request and response.
  locale TEXT NOT NULL,
  -- Terminal outcome of the execution attempt.
  status TEXT NOT NULL CHECK (status IN ('completed', 'aborted', 'error')),
  -- Current user UIMessage serialized as JSON, not the full message history.
  user_message_json TEXT NOT NULL,
  -- Ordered UIMessage identifiers supplied as context for this execution.
  context_message_ids_json TEXT NOT NULL,
  -- Identifier extracted from the assistant UIMessage for indexed lookup.
  response_message_id TEXT,
  -- Assistant UIMessage serialized as JSON, including client-visible tool output.
  response_message_json TEXT,
  -- Indicates that either stored UIMessage exceeded its application size limit.
  content_truncated INTEGER NOT NULL DEFAULT 0 CHECK (content_truncated IN (0, 1)),
  -- Provider that handled the model call.
  model_provider TEXT,
  -- Provider-specific model identifier used for the execution.
  model_name TEXT,
  -- Cloudflare Worker Version ID serving the request.
  release_id TEXT,
  -- Unix timestamp in milliseconds when execution began.
  started_at INTEGER NOT NULL,
  -- Unix timestamp in milliseconds when execution ended.
  finished_at INTEGER NOT NULL,
  -- Normalized AI SDK finish reason for the final model call.
  finish_reason TEXT,
  -- Sanitized application error category; raw provider errors are not stored.
  error_code TEXT,
  -- Provider-reported input token count for the full execution.
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  -- Provider-reported output token count for the full execution.
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  -- Provider-reported input tokens served from cache.
  cache_read_tokens INTEGER CHECK (cache_read_tokens IS NULL OR cache_read_tokens >= 0),
  -- Provider-reported reasoning token count when available.
  reasoning_tokens INTEGER CHECK (reasoning_tokens IS NULL OR reasoning_tokens >= 0),
  -- Number of model-generation steps in the execution.
  step_count INTEGER NOT NULL DEFAULT 0 CHECK (step_count >= 0),
  -- Number of tool calls represented in the assistant UIMessage.
  tool_call_count INTEGER NOT NULL DEFAULT 0 CHECK (tool_call_count >= 0),
  -- Milliseconds from execution start until the first streamed output.
  first_output_ms INTEGER CHECK (first_output_ms IS NULL OR first_output_ms >= 0),
  -- Marks developer traffic that should be excluded from product analysis.
  internal INTEGER NOT NULL DEFAULT 0 CHECK (internal IN (0, 1)),
  -- Version of the serialized JSON contract used by this row.
  schema_version INTEGER NOT NULL CHECK (schema_version > 0)
);

CREATE INDEX askiris_traces_turn_started_at
  ON askiris_traces (turn_id, started_at);

CREATE INDEX askiris_traces_segment_started_at
  ON askiris_traces (segment_id, started_at);

CREATE INDEX askiris_traces_status_started_at
  ON askiris_traces (status, started_at);

CREATE INDEX askiris_traces_release_started_at
  ON askiris_traces (release_id, started_at);

CREATE INDEX askiris_traces_response_message
  ON askiris_traces (response_message_id);
