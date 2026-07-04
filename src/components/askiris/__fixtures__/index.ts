import type { UIMessage } from "ai";
import wildlife from "./wildlife.json";
import table from "./table.json";

// Captured/synthesized message threads for deterministic UI work — feed one to
// AskIrisChat via `?fixture=<name>` (dev only) to reproduce a rendered reply
// without an LLM round-trip. Each is a plain JSON file: `wildlife` is a real
// captured session, `table` derives from it (a reply ending in a Markdown table).

export const FIXTURES: Record<string, UIMessage[]> = {
  wildlife: wildlife as unknown as UIMessage[],
  table: table as unknown as UIMessage[],
};
