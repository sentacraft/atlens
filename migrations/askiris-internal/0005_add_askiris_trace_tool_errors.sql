-- JSON array of {step, tool, error} for tool calls that threw; NULL when none did.
ALTER TABLE askiris_traces ADD COLUMN tool_errors_json TEXT CHECK (
  tool_errors_json IS NULL OR (
    json_valid(tool_errors_json)
    AND json_type(tool_errors_json) = 'array'
  )
);
