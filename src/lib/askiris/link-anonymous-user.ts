import "server-only";

import { transferAskIrisConversations } from "@/lib/askiris/conversation-repository";

/**
 * Gives an anonymous visitor's conversations to the account they signed in to, then
 * deletes the anonymous user. When the move fails the anonymous user is kept: deleting
 * it would cascade its conversations away.
 */
export async function linkAnonymousUser(
  db: D1Database,
  input: {
    anonymousUserId: string;
    newUserId: string;
    newUserIsAnonymous: boolean;
    deleteUser: (userId: string) => Promise<void>;
  },
): Promise<void> {
  if (input.newUserIsAnonymous || input.newUserId === input.anonymousUserId) {
    return;
  }
  // A failure here must not fail the sign-in it runs inside.
  try {
    await transferAskIrisConversations(db, {
      fromUserId: input.anonymousUserId,
      toUserId: input.newUserId,
    });
  } catch (error) {
    logFailure("failed to move anonymous conversations", input.anonymousUserId, error);
    return;
  }
  try {
    await input.deleteUser(input.anonymousUserId);
  } catch (error) {
    logFailure("failed to delete the anonymous user", input.anonymousUserId, error);
  }
}

function logFailure(what: string, anonymousUserId: string, error: unknown) {
  console.error(`[auth] ${what}`, {
    anonymousUserId,
    errorMessage: error instanceof Error ? error.message : String(error),
  });
}
