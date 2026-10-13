"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), emailOTPClient()],
});

type ClientSession = (typeof authClient)["$Infer"]["Session"];

/**
 * The account behind a session, or undefined for no session or an anonymous one.
 * Anonymous users exist so their conversations persist; the UI treats them as signed
 * out until they sign in for real.
 */
export function accountUser(session: ClientSession | null | undefined) {
  return session?.user && !session.user.isAnonymous ? session.user : undefined;
}
