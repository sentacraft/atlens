CREATE TABLE IF NOT EXISTS askiris_traces (
  trace_id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  mount TEXT NOT NULL,
  locale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'aborted', 'error')),
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  model_provider TEXT,
  model_id TEXT,
  finish_reason TEXT,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  internal INTEGER NOT NULL DEFAULT 0 CHECK (internal IN (0, 1)),
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS askiris_traces_status_started_at
  ON askiris_traces (status, started_at DESC);

CREATE INDEX IF NOT EXISTS askiris_traces_turn_started_at
  ON askiris_traces (turn_id, started_at ASC);

CREATE INDEX IF NOT EXISTS askiris_traces_segment_started_at
  ON askiris_traces (segment_id, started_at ASC);
