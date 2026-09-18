CREATE TABLE askiris_feedback (
  -- Unique identifier retained for the lifetime of one feedback record.
  feedback_id TEXT PRIMARY KEY,
  -- Stable identifier for the user turn being evaluated.
  turn_id TEXT NOT NULL,
  -- Assistant UIMessage identifier for the exact response being evaluated.
  response_message_id TEXT NOT NULL UNIQUE,
  -- Binary user assessment of the response.
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'unhelpful')),
  -- Optional stable code explaining the rating; display copy is not stored here.
  reason_code TEXT CHECK (reason_code IS NULL OR length(reason_code) <= 64),
  -- Unix timestamp in milliseconds when feedback was first submitted.
  created_at INTEGER NOT NULL,
  -- Unix timestamp in milliseconds when feedback was last changed.
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  -- Version of the feedback record contract used by this row.
  schema_version INTEGER NOT NULL CHECK (schema_version > 0)
);

CREATE INDEX askiris_feedback_turn_updated_at
  ON askiris_feedback (turn_id, updated_at);

CREATE INDEX askiris_feedback_rating_updated_at
  ON askiris_feedback (rating, updated_at);
