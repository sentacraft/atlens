import { getToolName, isToolUIPart, type UIMessage } from "ai";

// The tools whose results are specs or prices read from the catalog; reviews have their own sources.
const CATALOG_TOOLS = new Set(["queryLenses", "searchLensByName", "lensDetails", "listLenses", "recommendLenses", "myFavorites"]);

/** Whether a reply shows data it read from the lens catalog in this turn. */
export function usedCatalog(message: UIMessage): boolean {
  return message.parts.some(
    (part) => isToolUIPart(part) && part.state === "output-available" && CATALOG_TOOLS.has(getToolName(part)),
  );
}
