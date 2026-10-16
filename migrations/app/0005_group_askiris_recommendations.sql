-- recommendLenses now takes and returns groups: input {picks} -> {groups: [{picks}]}, output
-- {recommendations} -> {groups: [{title: null, recommendations}]}. Rewrites stored tool parts in
-- place; parts already in the grouped shape are left as they are, so rerunning is harmless.
UPDATE askiris_messages
SET message_json = json_set(
  message_json,
  '$.parts',
  (
    SELECT json_group_array(
      json(
        CASE
          WHEN step.value ->> '$.type' = 'tool-recommendLenses'
            AND step.value -> '$.output.recommendations' IS NOT NULL
            THEN json_set(
              step.value,
              '$.output',
              json_object(
                'groups',
                json_array(
                  json_object('title', NULL, 'recommendations', json(step.value -> '$.output.recommendations'))
                )
              )
            )
          ELSE step.value
        END
      )
      ORDER BY step.key
    )
    FROM (
      SELECT
        part.key AS key,
        CASE
          WHEN part.value ->> '$.type' = 'tool-recommendLenses'
            AND part.value -> '$.input.picks' IS NOT NULL
            THEN json_set(
              part.value,
              '$.input',
              json_object('groups', json_array(json_object('picks', json(part.value -> '$.input.picks'))))
            )
          ELSE part.value
        END AS value
      FROM json_each(message_json, '$.parts') AS part
    ) AS step
  )
)
WHERE message_json LIKE '%"tool-recommendLenses"%';
