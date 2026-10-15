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

/** True once the user skipped the gear card or chose not to sign in during this conversation. */
export function gearRequestDeclined(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some(
      (part) =>
        isToolUIPart(part) &&
        getToolName(part) === ASK_FOR_GEAR &&
        part.state === "output-available" &&
        (part.output as GearRequestOutput | undefined)?.outcome !== "saved",
    ),
  );
}
