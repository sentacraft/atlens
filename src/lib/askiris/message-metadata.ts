import type { UIMessage } from "ai";
import { z } from "zod";

export const askIrisMessageMetadataSchema = z.object({
  turnId: z.string().trim().min(1).max(128),
  traceId: z.string().trim().min(1).max(128),
  // The server history differed from what the client showed; the client reloads it.
  historyChanged: z.literal(true).optional(),
  // Development only: the model that answered, so the Test Hook panel's switch can be checked.
  model: z.string().max(128).optional(),
});

export type AskIrisMessageMetadata = z.infer<typeof askIrisMessageMetadataSchema>;
export type AskIrisUIMessage = UIMessage<AskIrisMessageMetadata>;
