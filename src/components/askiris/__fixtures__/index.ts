import type { UIMessage } from "ai";
import wildlife from "./wildlife.json";
import carousel from "./carousel.json";
import table from "./table.json";

// Captured/synthesized message threads for deterministic UI work — feed one to
// AskIrisChat via `?fixture=<name>` (dev only) to reproduce a rendered reply
// without an LLM round-trip. Each is a plain JSON file so all three stay
// parallel: `wildlife` is a real captured session, `carousel` and `table` were
// derived from it (a single 6-card deck; a reply ending in a Markdown table).

export const FIXTURES: Record<string, UIMessage[]> = {
  wildlife: wildlife as unknown as UIMessage[],
  carousel: carousel as unknown as UIMessage[],
  table: table as unknown as UIMessage[],
};
