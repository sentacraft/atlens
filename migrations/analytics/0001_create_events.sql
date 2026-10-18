CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  event TEXT NOT NULL,
  vid TEXT,
  locale TEXT,
  path TEXT,
  signed_in INTEGER NOT NULL DEFAULT 0,
  internal INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  origin TEXT NOT NULL DEFAULT 'live',
  props TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(props))
);

CREATE INDEX events_event_ts ON events (event, ts);
CREATE INDEX events_ts ON events (ts);
