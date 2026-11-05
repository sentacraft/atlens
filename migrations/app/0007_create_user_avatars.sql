-- A photo the user uploaded as their avatar: a small square JPEG or PNG, at most one per user.
-- original_image keeps the user's image from before the first upload (a sign-in provider's
-- picture, or NULL), so removing the photo puts it back.
CREATE TABLE user_avatars (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  image BLOB NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
  original_image TEXT,
  updated_at INTEGER NOT NULL
);
