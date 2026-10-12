import "server-only";

import { createAuth } from "@/lib/auth";

export async function getAskIrisUserId(request: Request): Promise<string | undefined> {
  const session = await createAuth().api.getSession({ headers: request.headers });
  return session?.user.id;
}
