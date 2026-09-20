import type { UIMessage } from "ai";
import { z } from "zod";

export const askIrisMessageMetadataSchema = z.object({
  turnId: z.string().trim().min(1).max(128),
  traceId: z.string().trim().min(1).max(128),
});

export type AskIrisMessageMetadata = z.infer<typeof askIrisMessageMetadataSchema>;
export type AskIrisUIMessage = UIMessage<AskIrisMessageMetadata>;
