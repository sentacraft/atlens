-- Better Auth anonymous plugin: marks users created by signIn.anonymous().
ALTER TABLE user ADD COLUMN isAnonymous INTEGER DEFAULT 0;

-- Better Auth rate limiting with database storage; one counter row per IP + path.
CREATE TABLE rateLimit (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  lastRequest INTEGER NOT NULL
);
