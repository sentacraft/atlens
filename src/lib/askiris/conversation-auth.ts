import "server-only";

import { getSessionCookie } from "better-auth/cookies";
import { createAuth } from "@/lib/auth";

export async function getAskIrisUserId(request: Request): Promise<string | undefined> {
  const session = await createAuth().api.getSession({ headers: request.headers });
  return session?.user.id;
}

// For server renders that need to agree with the client about sign-in state. A
// request without a session cookie is answered without building the auth instance,
// which keeps anonymous visitors off D1 and lets environments without
// BETTER_AUTH_SECRET (CI) render the page. A failed lookup renders the page signed
// out rather than failing it; the client session store corrects it once it answers.
export async function hasAskIrisSession(headers: Headers): Promise<boolean> {
  if (!getSessionCookie(headers)) {
    return false;
  }
  try {
    const session = await createAuth().api.getSession({ headers });
    return Boolean(session?.user);
  } catch (error) {
    console.error("[askiris] server session lookup failed", {
      errorType: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
