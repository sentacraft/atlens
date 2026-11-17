import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { z } from "zod";

export const ASK_TO_SIGN_IN = "askToSignIn";
export const signInInputSchema = z.object({});
export const signInOutputSchema = z.strictObject({ outcome: z.enum(["signed_in", "cancelled"]) });
export type SignInOutput = z.infer<typeof signInOutputSchema>;

export function signInCancelled(messages: UIMessage[]): boolean {
  return messages.slice(messages.findLastIndex((message) => message.role === "user")).some((message) => message.parts.some((part) =>
    isToolUIPart(part) && getToolName(part) === ASK_TO_SIGN_IN && part.state === "output-available" &&
    (part.output as SignInOutput | undefined)?.outcome === "cancelled",
  ));
}
