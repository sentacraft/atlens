-- queryLenses now takes several constraint sets: input {...constraints} -> {queries: [{...}]},
-- output {matches, maybe, ...} -> {results: [{matches, maybe, ...}]}. Rewrites stored tool parts in
-- place; parts already in the new shape are left as they are, so rerunning is harmless.
UPDATE askiris_messages
SET message_json = json_set(
  message_json,
  '$.parts',
  (
    SELECT json_group_array(
      json(
        CASE
          WHEN step.value ->> '$.type' = 'tool-queryLenses'
            AND step.value -> '$.output.matches' IS NOT NULL
            THEN json_set(step.value, '$.output', json_object('results', json_array(json(step.value -> '$.output'))))
          ELSE step.value
        END
      )
      ORDER BY step.key
    )
    FROM (
      SELECT
        part.key AS key,
        CASE
          WHEN part.value ->> '$.type' = 'tool-queryLenses'
            AND part.value ->> '$.input' IS NOT NULL
            AND part.value -> '$.input.queries' IS NULL
            THEN json_set(part.value, '$.input', json_object('queries', json_array(json(part.value -> '$.input'))))
          ELSE part.value
        END AS value
      FROM json_each(message_json, '$.parts') AS part
    ) AS step
  )
)
WHERE message_json LIKE '%"tool-queryLenses"%';
