-- Coarse request attributes recorded server-side: ISO country, network class
-- (datacenter | mobile | other) and user-agent class (bot | in_app | browser).
ALTER TABLE events ADD COLUMN country TEXT;
ALTER TABLE events ADD COLUMN network TEXT;
ALTER TABLE events ADD COLUMN ua_class TEXT;
