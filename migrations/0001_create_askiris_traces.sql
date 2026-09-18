CREATE TABLE askiris_traces (
  trace_id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  mount TEXT NOT NULL,
  locale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'aborted', 'error')),
  user_message_json TEXT NOT NULL,
  context_message_ids_json TEXT NOT NULL,
  response_message_id TEXT,
  response_message_json TEXT,
  content_truncated INTEGER NOT NULL DEFAULT 0 CHECK (content_truncated IN (0, 1)),
  model_provider TEXT,
  model_name TEXT,
  release_id TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  finish_reason TEXT,
  error_code TEXT,
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  cache_read_tokens INTEGER CHECK (cache_read_tokens IS NULL OR cache_read_tokens >= 0),
  reasoning_tokens INTEGER CHECK (reasoning_tokens IS NULL OR reasoning_tokens >= 0),
  step_count INTEGER NOT NULL DEFAULT 0 CHECK (step_count >= 0),
  tool_call_count INTEGER NOT NULL DEFAULT 0 CHECK (tool_call_count >= 0),
  first_output_ms INTEGER CHECK (first_output_ms IS NULL OR first_output_ms >= 0),
  internal INTEGER NOT NULL DEFAULT 0 CHECK (internal IN (0, 1)),
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
