CREATE TABLE askiris_response_feedback (
  -- No foreign key: feedback submission can race the trace's waitUntil write.
  -- Unique identifier retained for the lifetime of one feedback record.
  feedback_id TEXT PRIMARY KEY,
  -- Stable identifier for the user turn being evaluated.
  turn_id TEXT NOT NULL,
  -- Assistant UIMessage identifier for the exact response being evaluated.
  response_message_id TEXT NOT NULL UNIQUE,
  -- Binary user assessment of the response.
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'unhelpful')),
  -- Optional JSON array of stable reason codes; display copy is not stored here.
  reason_codes_json TEXT CHECK (
    reason_codes_json IS NULL OR (
      json_valid(reason_codes_json)
      AND json_type(reason_codes_json) = 'array'
    )
  ),
  -- Optional free-form detail supplied with an unhelpful rating.
  comment TEXT CHECK (comment IS NULL OR length(comment) <= 2000),
  -- Unix timestamp in milliseconds when feedback was first submitted.
  created_at INTEGER NOT NULL,
  -- Unix timestamp in milliseconds when feedback was last changed.
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  CHECK (
    rating = 'unhelpful'
    OR (reason_codes_json IS NULL AND comment IS NULL)
  )
);

CREATE INDEX askiris_response_feedback_turn_updated_at
  ON askiris_response_feedback (turn_id, updated_at);

CREATE INDEX askiris_response_feedback_rating_updated_at
  ON askiris_response_feedback (rating, updated_at);
