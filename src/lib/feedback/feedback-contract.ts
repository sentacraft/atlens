import { z } from "zod";

export const MAX_FEEDBACK_DESCRIPTION_LENGTH = 2000;

export const feedbackContextSchema = z.object({
  lensId: z.string().optional(),
  lensModel: z.string().optional(),
  lensBrand: z.string().optional(),
  searchQuery: z.string().optional(),
  field: z.string().optional(),
});

// Issue messages are the error codes the route returns.
export const feedbackSubmissionSchema = z
  .object({
    type: z.enum(["data_issue", "general"], { error: "invalid_type" }),
    description: z
      .string({ error: "empty_description" })
      .max(MAX_FEEDBACK_DESCRIPTION_LENGTH, { error: "description_too_long" }),
    replyContact: z.string().optional(),
    context: feedbackContextSchema
      .extend({
        currentValue: z.string().optional(),
        suggestedCorrection: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (payload) =>
      payload.description.trim().length > 0 || Boolean(payload.context?.suggestedCorrection?.trim()),
    { error: "empty_description" },
  );

export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackType = FeedbackSubmission["type"];
export type FeedbackSubmissionContext = NonNullable<FeedbackSubmission["context"]>;
