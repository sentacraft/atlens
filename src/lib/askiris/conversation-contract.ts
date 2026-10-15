import { z } from "zod";

export const MAX_CONVERSATION_TITLE_LENGTH = 120;

export const conversationRenameSchema = z.strictObject({
  title: z.string().trim().min(1).max(MAX_CONVERSATION_TITLE_LENGTH),
});

export type ConversationRename = z.infer<typeof conversationRenameSchema>;
