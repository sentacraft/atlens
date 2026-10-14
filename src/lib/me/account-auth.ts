import "server-only";

import { createAuth } from "@/lib/auth";

/** The signed-in user's id; undefined without a session or for an anonymous (guest) session. */
export async function getAccountUserId(request: Request): Promise<string | undefined> {
  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session || session.user.isAnonymous) {
    return undefined;
  }
  return session.user.id;
}
