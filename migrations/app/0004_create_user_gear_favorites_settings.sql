-- One row per camera body or lens a user owns: a catalog item (catalog_id), or a
-- manual lens entry (manual_json, validated by manualLensSchema).
CREATE TABLE user_gear (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('body', 'lens')),
  catalog_id TEXT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  mount TEXT NOT NULL CHECK (mount IN ('X', 'G')),
  manual_json TEXT CHECK (manual_json IS NULL OR json_valid(manual_json)),
  created_at INTEGER NOT NULL,
  CHECK ((catalog_id IS NULL) = (manual_json IS NOT NULL)),
  CHECK (kind = 'lens' OR catalog_id IS NOT NULL),
  UNIQUE (user_id, kind, catalog_id)
);

CREATE INDEX user_gear_user_created_at ON user_gear (user_id, created_at);

CREATE TABLE user_favorites (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  lens_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lens_id)
);

-- One column per setting. NULL locale means the user never chose one.
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  default_mount TEXT NOT NULL DEFAULT 'X' CHECK (default_mount IN ('X', 'G')),
  locale TEXT CHECK (locale IS NULL OR locale IN ('zh', 'en')),
  updated_at INTEGER NOT NULL
);
