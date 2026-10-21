import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { z } from "zod";

/** The client tool that shows the in-chat gear card; it has no server `execute`. */
export const ASK_FOR_GEAR = "askForGear";

export const gearRequestInputSchema = z.object({
  bodies: z
    .array(z.string().trim().min(1).max(60))
    .max(5)
    .optional()
    .describe("Camera bodies the user named in this conversation, as they wrote them (e.g. 'X-T5')."),
  lenses: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .optional()
    .describe("Lenses the user named in this conversation, as they wrote them (e.g. '18-55')."),
});

export const gearRequestOutputSchema = z.object({
  outcome: z.enum(["saved", "skipped", "not_signed_in"]),
  /** Names of what the user's profile holds after saving, shown on the answered card. */
  saved: z.array(z.string().max(160)).max(200).optional(),
});

export type GearRequestInput = z.infer<typeof gearRequestInputSchema>;
export type GearRequestOutput = z.infer<typeof gearRequestOutputSchema>;

/** How a gear card ended without saving. */
export type GearCardDecline = "skipped" | "not_signed_in";

/**
 * How a gear card in this conversation ended without saving: the form skipped (or typed past
 * without an answer), or a guest choosing to tell Iris in chat instead of signing in.
 */
export function gearCardDecline(messages: UIMessage[]): GearCardDecline | null {
  let decline: GearCardDecline | null = null;
  for (const part of messages.flatMap((message) => message.parts)) {
    if (!isToolUIPart(part) || getToolName(part) !== ASK_FOR_GEAR) {
      continue;
    }
    const outcome = part.state === "output-available" ? (part.output as GearRequestOutput | undefined)?.outcome : undefined;
    if (outcome !== "saved") {
      decline = outcome === "not_signed_in" ? "not_signed_in" : "skipped";
    }
  }
  return decline;
}
