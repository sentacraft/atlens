-- Whether the account has finished the returning-visit support prompt on any device.
ALTER TABLE user_settings ADD COLUMN revisit_prompt_done INTEGER NOT NULL DEFAULT 0 CHECK (revisit_prompt_done IN (0, 1));
