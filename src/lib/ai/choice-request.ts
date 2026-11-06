import { z } from "zod";

/** The client tool that shows the in-chat choice card; it has no server `execute`. */
export const ASK_CHOICES = "askChoices";

export const MAX_CHOICE_GROUPS = 3;

const choiceGroupSchema = z.object({
  question: z.string().trim().min(1).max(120).describe("The question, short, in the reply language."),
  options: z
    .array(z.string().trim().min(1).max(40))
    .min(2)
    .max(5)
    .describe("Answers a user could pick, short noun phrases. The card adds its own free-text option."),
  multiple: z.boolean().nullish().describe("true when more than one answer can apply; default is pick one."),
});

export const choiceRequestInputSchema = z.object({
  questions: z.array(choiceGroupSchema).min(1).max(MAX_CHOICE_GROUPS),
});

export const choiceRequestOutputSchema = z.object({
  outcome: z.enum(["answered", "skipped"]),
  /** One entry per question, in order; `picked` is empty for a group the user left alone. */
  answers: z
    .array(z.object({ question: z.string().max(120), picked: z.array(z.string().max(120)).max(8) }))
    .max(MAX_CHOICE_GROUPS)
    .optional(),
});

export type ChoiceRequestInput = z.infer<typeof choiceRequestInputSchema>;
export type ChoiceRequestOutput = z.infer<typeof choiceRequestOutputSchema>;
