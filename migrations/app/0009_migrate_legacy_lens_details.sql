-- Stored lensDetails parts from before lens images moved to their own tool, rewritten in place to the
-- current shapes. Rows already in the new shape are left as they are, so rerunning is harmless.
--
-- 1. A tool-lensDetails input {refs: [r1, r2]} becomes {lenses: [{ref: r1}, {ref: r2}]}.
-- 2. A tool-lensDetails part whose output carries a non-empty displayImages becomes two consecutive parts:
--    the lensDetails part without any image field (displayImages, readRefs, historical, and each lens's
--    images and imageResults), then a tool-showLensImages part (toolCallId = original id + '-images')
--    holding the images. Legacy gallery arrays are flattened into displayImages (deduplicated by
--    imageRef), and every image gets a figure number (1-based across the message) and a figureLabel
--    ("图 n" for zh, "Fig. n" otherwise). The label's locale is the message's own context_json locale,
--    else the conversation's most recent context locale, else zh.

UPDATE askiris_messages
SET message_json = json_set(
  message_json,
  '$.parts',
  (
    SELECT json_group_array(
      json(
        CASE
          WHEN part.value ->> '$.type' = 'tool-lensDetails'
            AND part.value -> '$.input.refs' IS NOT NULL
            THEN json_set(
              part.value,
              '$.input',
              json_object(
                'lenses',
                (SELECT json_group_array(json_object('ref', r.value) ORDER BY r.key) FROM json_each(part.value, '$.input.refs') AS r)
              )
            )
          ELSE part.value
        END
      )
      ORDER BY part.key
    )
    FROM json_each(message_json, '$.parts') AS part
  )
)
WHERE message_json LIKE '%"tool-lensDetails"%'
  AND EXISTS (
    SELECT 1 FROM json_each(message_json, '$.parts') AS legacy
    WHERE legacy.value ->> '$.type' = 'tool-lensDetails' AND legacy.value -> '$.input.refs' IS NOT NULL
  );

UPDATE askiris_messages AS m
SET message_json = json_set(
  m.message_json,
  '$.parts',
  (
    WITH
    locale AS (
      SELECT COALESCE(
        m.context_json ->> '$.locale',
        (
          SELECT c.context_json ->> '$.locale' FROM askiris_messages AS c
          WHERE c.conversation_id = m.conversation_id AND c.context_json ->> '$.locale' IS NOT NULL
          ORDER BY c.sequence DESC LIMIT 1
        ),
        'zh'
      ) AS value
    ),
    parts AS (
      SELECT p.key AS k, p.value AS v FROM json_each(m.message_json, '$.parts') AS p
    ),
    split AS (
      SELECT k, v FROM parts
      WHERE v ->> '$.type' = 'tool-lensDetails' AND json_array_length(v, '$.output.displayImages') > 0
    ),
    raw AS (
      SELECT s.k AS k, d.key AS e, 0 AS sub, d.value AS img
      FROM split AS s, json_each(s.v, '$.output.displayImages') AS d
      UNION ALL
      SELECT s.k, d.key, g.key + 1, g.value
      FROM split AS s, json_each(s.v, '$.output.displayImages') AS d, json_each(d.value, '$.gallery') AS g
    ),
    uniq AS (
      SELECT k, e, sub, img,
        ROW_NUMBER() OVER (PARTITION BY k, img ->> '$.imageRef' ORDER BY e, sub) AS dup
      FROM raw
    ),
    ordered AS (
      SELECT k, img, ROW_NUMBER() OVER (PARTITION BY k ORDER BY e, sub) AS n
      FROM uniq WHERE dup = 1
    ),
    numbered AS (
      SELECT o.k AS k, o.n AS n,
        o.n + (SELECT COUNT(*) FROM ordered AS earlier WHERE earlier.k < o.k) AS figure,
        o.img AS img
      FROM ordered AS o
    ),
    shown AS (
      SELECT k, n,
        json_set(
          json_remove(img, '$.gallery'),
          '$.figure', figure,
          '$.figureLabel', CASE WHEN (SELECT value FROM locale) = 'zh' THEN '图 ' || figure ELSE 'Fig. ' || figure END
        ) AS img,
        img ->> '$.lensRef' AS lens,
        img ->> '$.image.role' AS role
      FROM numbered
    ),
    lens_order AS (
      SELECT k, lens, MIN(n) AS first FROM shown GROUP BY k, lens
    ),
    role_order AS (
      SELECT k, lens, role,
        ROW_NUMBER() OVER (PARTITION BY k, lens ORDER BY MIN(n)) AS rn,
        MIN(n) AS first
      FROM shown GROUP BY k, lens, role
    )
    SELECT json_group_array(json(emitted.val) ORDER BY emitted.ord) FROM (
      SELECT p.k * 2 AS ord, p.v AS val FROM parts AS p WHERE p.k NOT IN (SELECT k FROM split)
      UNION ALL
      SELECT s.k * 2,
        json_set(
          json_remove(s.v, '$.output.displayImages', '$.output.readRefs', '$.output.historical'),
          '$.input',
          json_object('lenses', (SELECT json_group_array(json_object('ref', i.value ->> '$.ref') ORDER BY i.key) FROM json_each(s.v, '$.input.lenses') AS i)),
          '$.output.lenses',
          (SELECT json_group_array(json_remove(l.value, '$.images', '$.imageResults') ORDER BY l.key) FROM json_each(s.v, '$.output.lenses') AS l)
        )
      FROM split AS s
      UNION ALL
      SELECT s.k * 2 + 1,
        json_object(
          'type', 'tool-showLensImages',
          'toolCallId', (s.v ->> '$.toolCallId') || '-images',
          'state', s.v ->> '$.state',
          'input', json_object(
            'lenses',
            (
              SELECT json_group_array(
                json_object(
                  'ref', lo.lens,
                  'images', (SELECT json_group_array(json_object('role', ro.role) ORDER BY ro.rn) FROM role_order AS ro WHERE ro.k = lo.k AND ro.lens = lo.lens AND ro.rn <= 3)
                )
                ORDER BY lo.first
              )
              FROM lens_order AS lo WHERE lo.k = s.k
            )
          ),
          'output', json_object(
            'lenses',
            (
              SELECT json_group_array(
                json_patch(
                  json_object(
                    'ref', lo.lens,
                    'name', old.value ->> '$.name',
                    'maxAperture', json(old.value -> '$.maxAperture'),
                    'focalNativeMm', json(old.value -> '$.focalNativeMm'),
                    'images', json(COALESCE(old.value -> '$.images', '[]')),
                    'imageResults', json(old.value -> '$.imageResults')
                  ),
                  -- A lens without imageResults keeps none, as showLensImages leaves them out when empty.
                  CASE WHEN old.value -> '$.imageResults' IS NULL THEN '{"imageResults":null}' ELSE '{}' END
                )
                ORDER BY lo.first
              )
              FROM lens_order AS lo
              LEFT JOIN json_each(s.v, '$.output.lenses') AS old ON old.value ->> '$.ref' = lo.lens
              WHERE lo.k = s.k
            ),
            'displayImages',
            (SELECT json_group_array(json(sh.img) ORDER BY sh.n) FROM shown AS sh WHERE sh.k = s.k)
          )
        )
      FROM split AS s
    ) AS emitted
  )
)
WHERE m.message_json LIKE '%"tool-lensDetails"%'
  AND EXISTS (
    SELECT 1 FROM json_each(m.message_json, '$.parts') AS legacy
    WHERE legacy.value ->> '$.type' = 'tool-lensDetails' AND json_array_length(legacy.value, '$.output.displayImages') > 0
  );
