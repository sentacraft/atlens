CREATE TABLE feedback_submissions (
  submission_id TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'uncertain')),
  issue_number INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
