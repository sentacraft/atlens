"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient, emailOTPClient } from "better-auth/client/plugins";
import { AUTH_LOCALE_HEADER } from "@/lib/auth-locale";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), emailOTPClient()],
  fetchOptions: {
    onRequest(context) {
      context.headers.set(AUTH_LOCALE_HEADER, document.documentElement.lang);
      return context;
    },
  },
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
