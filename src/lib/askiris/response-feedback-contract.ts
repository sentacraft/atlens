import { z } from "zod";

const MAX_REASON_COUNT = 10;

export const askIrisResponseFeedbackInputSchema = z.object({
  turnId: z.string().trim().min(1).max(128),
  responseMessageId: z.string().trim().min(1).max(128),
  rating: z.enum(["helpful", "unhelpful"]),
  reasonCodes: z
    .array(z.string().trim().min(1).max(64))
    .max(MAX_REASON_COUNT)
    .optional(),
  comment: z.string().trim().max(2000).optional(),
});

export type AskIrisResponseFeedbackInput = z.infer<
  typeof askIrisResponseFeedbackInputSchema
>;

export type AskIrisResponseFeedbackRating = AskIrisResponseFeedbackInput["rating"];
