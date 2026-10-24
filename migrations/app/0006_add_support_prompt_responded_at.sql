-- When the account last responded to a support prompt (closed it or followed it), on any device; epoch ms.
ALTER TABLE user_settings ADD COLUMN support_prompt_responded_at INTEGER;
