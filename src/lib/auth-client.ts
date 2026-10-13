"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), emailOTPClient()],
});

type ClientSession = (typeof authClient)["$Infer"]["Session"];

export function accountUser(session: ClientSession | null | undefined) {
  return session?.user && !session.user.isAnonymous ? session.user : undefined;
}

/** Signs the visitor in anonymously unless a session exists; false when that fails. */
export async function ensureSession(): Promise<boolean> {
  const { data } = await authClient.getSession();
  if (data) {
    return true;
  }
  const { error } = await authClient.signIn.anonymous();
  return !error;
}
