import type { UIMessage } from "ai";

/**
 * The /api/chat request body. Only the newest message is sent: the server holds the
 * rest of the conversation. `previousMessageId` is the message the client shows before
 * it, so the server can tell when the two histories have diverged.
 */
export function askIrisChatRequestBody(
  messages: UIMessage[],
  body: Record<string, unknown> | undefined,
) {
  return {
    ...body,
    message: messages.at(-1),
    previousMessageId: messages.at(-2)?.id ?? null,
  };
}
