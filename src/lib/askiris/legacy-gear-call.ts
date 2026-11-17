import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { ASK_TO_SIGN_IN } from "@/lib/ai/sign-in-request";

// Stored pending myGear calls resume through sign-in, never a retired server reader.
// Remove this adapter once no stored pending myGear calls remain.
export function normalizeLegacyGearCalls<M extends UIMessage>(messages: M[], { incoming = false } = {}): M[] {
  return messages.map((message) => !Array.isArray(message.parts) || message.role !== "assistant" ? message : ({
    ...message,
    parts: message.parts.map((part) => {
      if (!part || typeof part.type !== "string" || !isToolUIPart(part) || getToolName(part) !== "myGear" ||
        (part.state !== "input-available" && part.state !== "approval-requested" && part.state !== "approval-responded")) {
        return part;
      }
      const base = { type: `tool-${ASK_TO_SIGN_IN}` as const, toolCallId: part.toolCallId, input: {} };
      if (part.state === "approval-responded" && (!part.approval.approved || incoming)) {
        return { ...base, state: "output-available" as const, output: { outcome: part.approval.approved ? "signed_in" : "cancelled" } };
      }
      return { ...base, state: "input-available" as const };
    }),
  } as M));
}
