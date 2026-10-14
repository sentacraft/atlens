-- One row per camera body or lens a user owns. A row either points at the catalog
-- (catalog_id) or, for lenses only, holds the user's manual entry.
CREATE TABLE user_gear (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('body', 'lens')),
  catalog_id TEXT,
  name TEXT NOT NULL,
  mount TEXT NOT NULL CHECK (mount IN ('X', 'G')),
  brand TEXT NOT NULL,
  model TEXT,
  focal_min_mm REAL CHECK (focal_min_mm IS NULL OR focal_min_mm > 0),
  focal_max_mm REAL CHECK (focal_max_mm IS NULL OR focal_max_mm >= focal_min_mm),
  max_aperture_wide REAL,
  max_aperture_tele REAL,
  autofocus INTEGER CHECK (autofocus IS NULL OR autofocus IN (0, 1)),
  ois INTEGER CHECK (ois IS NULL OR ois IN (0, 1)),
  adapted INTEGER CHECK (adapted IS NULL OR adapted IN (0, 1)),
  original_mount TEXT,
  weather_resistant INTEGER CHECK (weather_resistant IS NULL OR weather_resistant IN (0, 1)),
  aperture_ring INTEGER CHECK (aperture_ring IS NULL OR aperture_ring IN (0, 1)),
  power_zoom INTEGER CHECK (power_zoom IS NULL OR power_zoom IN (0, 1)),
  internal_zoom INTEGER CHECK (internal_zoom IS NULL OR internal_zoom IN (0, 1)),
  optical_traits TEXT CHECK (optical_traits IS NULL OR json_valid(optical_traits)),
  usage TEXT CHECK (usage IS NULL OR usage IN ('photo', 'cine')),
  focus_motor TEXT CHECK (focus_motor IS NULL OR focus_motor IN ('linear', 'stepping', 'dc', 'other', 'unknown')),
  weight_g INTEGER CHECK (weight_g IS NULL OR weight_g > 0),
  notes TEXT,
  created_at INTEGER NOT NULL,
  CHECK (
    catalog_id IS NOT NULL
    OR (kind = 'lens' AND model IS NOT NULL AND focal_min_mm IS NOT NULL AND focal_max_mm IS NOT NULL)
  ),
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
