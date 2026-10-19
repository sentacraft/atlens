-- A visitor's session ends after 30 minutes without an event; session_id numbers them per visitor.
CREATE VIEW event_sessions AS
SELECT
  *,
  vid || ':' || SUM(starts_session) OVER (PARTITION BY vid ORDER BY ts, id ROWS UNBOUNDED PRECEDING) AS session_id
FROM (
  SELECT
    *,
    CASE WHEN ts - LAG(ts) OVER (PARTITION BY vid ORDER BY ts, id) <= 1800000 THEN 0 ELSE 1 END AS starts_session
  FROM events
  WHERE vid IS NOT NULL
);
