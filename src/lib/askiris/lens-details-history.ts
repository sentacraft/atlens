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
