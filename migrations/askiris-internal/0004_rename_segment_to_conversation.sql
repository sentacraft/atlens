ALTER TABLE askiris_traces RENAME COLUMN segment_id TO conversation_id;

DROP INDEX askiris_traces_segment_started_at;

CREATE INDEX askiris_traces_conversation_started_at
  ON askiris_traces (conversation_id, started_at);
