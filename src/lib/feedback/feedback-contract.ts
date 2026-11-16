import { z } from "zod";

export const MAX_FEEDBACK_DESCRIPTION_LENGTH = 2000;
export const MAX_FEEDBACK_SEARCH_QUERY_LENGTH = 300;

export const feedbackContextSchema = z.object({
  lensId: z.string().max(200).optional(),
  lensModel: z.string().max(300).optional(),
  lensBrand: z.string().max(100).optional(),
  searchQuery: z.string().max(MAX_FEEDBACK_SEARCH_QUERY_LENGTH).optional(),
  field: z.string().max(200).optional(),
});

// Issue messages are the error codes the route returns.
export const feedbackSubmissionSchema = z
  .object({
    submissionId: z.uuid(),
    type: z.enum(["data_issue", "general"], { error: "invalid_type" }),
    description: z
      .string({ error: "empty_description" })
      .max(MAX_FEEDBACK_DESCRIPTION_LENGTH, { error: "description_too_long" }),
    replyContact: z.string().trim().max(300).optional(),
    context: feedbackContextSchema
      .extend({
        currentValue: z.string().max(2000).optional(),
        suggestedCorrection: z.string().max(200).optional(),
      })
      .optional(),
  })
  .refine(
    (payload) =>
      payload.description.trim().length > 0 || Boolean(payload.context?.suggestedCorrection?.trim()),
    { error: "empty_description" },
  );

export const feedbackStatusSchema = z.object({
  status: z.enum(["pending", "sent", "failed", "uncertain"]).nullable(),
});
export type FeedbackStatus = NonNullable<z.infer<typeof feedbackStatusSchema>["status"]>;

export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackType = FeedbackSubmission["type"];
export type FeedbackSubmissionContext = NonNullable<FeedbackSubmission["context"]>;
