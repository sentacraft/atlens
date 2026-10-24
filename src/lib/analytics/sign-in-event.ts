import "server-only";

import { SIGN_IN_COMPLETE_EVENT, type SignInCompleteProps } from "@/lib/analytics/events";
import { isInternalBrowser, readVid, type CookieReader } from "@/lib/analytics/session";
import { insertEvent } from "@/lib/analytics/store";
import { isBypassed } from "@/lib/rate-limit";

// A sign-up writes the user and its first session in one request.
const SAME_REQUEST_MS = 60_000;

/** How a session-creating auth route signed someone in; null for routes that are not a sign-in. */
function methodOf(path: string, provider: string | undefined): SignInCompleteProps["method"] | null {
  // The path is the route's pattern, "/callback/:id", so the provider comes from its params.
  if (path.startsWith("/callback/")) {
    return provider === "github" ? "github" : provider === "google" ? "google" : null;
  }
  if (path === "/one-tap/callback") {
    return "one_tap";
  }
  return path === "/sign-in/email-otp" ? "email" : null;
}

export interface CreatedSession {
  path: string;
  /** The social provider of a `/callback/:id` route. */
  provider?: string;
  user: { isAnonymous?: boolean | null; createdAt: Date };
  sessionCreatedAt: Date;
}

/** The completed sign-in a new session stands for; null for a guest session or a session that is not a sign-in. */
export function signInCompleteProps({ path, provider, user, sessionCreatedAt }: CreatedSession): SignInCompleteProps | null {
  const method = methodOf(path, provider);
  if (!method || user.isAnonymous) {
    return null;
  }
  return {
    method,
    new_account: Math.abs(sessionCreatedAt.getTime() - user.createdAt.getTime()) <= SAME_REQUEST_MS,
  };
}

/** Records a completed sign-in against the visitor that sent the request. */
export async function recordSignIn(
  db: D1Database,
  session: CreatedSession,
  request: { cookies: CookieReader; raw: Request | undefined },
): Promise<void> {
  const props = signInCompleteProps(session);
  if (!props) {
    return;
  }
  await insertEvent(db, {
    event: SIGN_IN_COMPLETE_EVENT,
    ts: session.sessionCreatedAt.getTime(),
    vid: readVid(request.cookies),
    locale: null,
    path: null,
    signedIn: true,
    internal: isInternalBrowser(request.cookies) || (request.raw ? isBypassed(request.raw) : false),
    props,
  });
}
