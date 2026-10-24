CREATE TABLE lens_reviews (
  lens_id TEXT PRIMARY KEY,
  sources TEXT NOT NULL CHECK (json_valid(sources)),
  claims TEXT NOT NULL CHECK (json_valid(claims)),
  source_count INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  pipeline_rev TEXT NOT NULL
);
