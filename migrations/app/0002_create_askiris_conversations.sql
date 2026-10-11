CREATE TABLE askiris_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX askiris_conversations_user_updated_at
  ON askiris_conversations (user_id, updated_at DESC);

CREATE TABLE askiris_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES askiris_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  sequence INTEGER NOT NULL CHECK (sequence >= 0),
  message_json TEXT NOT NULL CHECK (json_valid(message_json)),
  context_json TEXT CHECK (context_json IS NULL OR json_valid(context_json)),
  created_at INTEGER NOT NULL,
  UNIQUE (conversation_id, sequence)
);

CREATE INDEX askiris_messages_conversation_sequence
  ON askiris_messages (conversation_id, sequence);
