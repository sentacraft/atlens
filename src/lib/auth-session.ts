import "server-only";

import { createAuth } from "@/lib/auth";

async function getSessionUser(request: Request) {
  const session = await createAuth().api.getSession({ headers: request.headers });
  return session?.user;
}

/** The session's user id, guest (anonymous) sessions included. */
export async function getSessionUserId(request: Request): Promise<string | undefined> {
  return (await getSessionUser(request))?.id;
}

/** The signed-in account's user id; undefined without a session or for a guest session. */
export async function getAccountUserId(request: Request): Promise<string | undefined> {
  const user = await getSessionUser(request);
  return user && !user.isAnonymous ? user.id : undefined;
}
