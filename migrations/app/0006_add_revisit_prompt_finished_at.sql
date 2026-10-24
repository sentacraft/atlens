-- When the account last closed or followed the returning-visit support prompt, on any device.
ALTER TABLE user_settings ADD COLUMN revisit_prompt_finished_at INTEGER;
