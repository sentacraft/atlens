import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { z } from "zod";

const legacyInput = z.strictObject({ refs: z.array(z.string()).min(1) });
const legacyMessage = z.looseObject({ parts: z.array(z.unknown()) });
const legacyPart = z.looseObject({ type: z.literal("tool-lensDetails"), input: legacyInput });

// Saved replies and paused cards can still carry the old input after a deployment.
export function normalizeLensDetailsMessage<T>(message: T): T {
  const parsed = legacyMessage.safeParse(message);
  if (!parsed.success) {return message;}
  let changed = false;
  const parts = parsed.data.parts.map((part) => {
    const detail = legacyPart.safeParse(part);
    if (!detail.success) {return part;}
    changed = true;
    return { ...detail.data, input: { lenses: detail.data.input.refs.map((ref) => ({ ref })) } };
  });
  return changed ? { ...message, parts } : message;
}

export function withHistoricalLensPresentation(message: UIMessage): UIMessage {
  if (message.role !== "assistant") {return message;}
  return {
    ...message,
    parts: message.parts.map((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") {return part;}
      const name = getToolName(part);
      if (name !== "lensDetails" && name !== "listLenses") {return part;}
      const output = part.output;
      if (!output || typeof output !== "object" || Array.isArray(output)) {return part;}
      return { ...part, output: { ...output, historical: true, ...(name === "lensDetails" ? { readRefs: [] } : {}) } };
    }),
  };
}
