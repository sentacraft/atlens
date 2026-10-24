"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient, emailOTPClient, oneTapClient } from "better-auth/client/plugins";
import { GOOGLE_CLIENT_ID } from "@/config/google";
import { LOCALE_HEADER } from "@/lib/locale-preference";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), emailOTPClient(), oneTapClient({ clientId: GOOGLE_CLIENT_ID, context: "signin" })],
  fetchOptions: {
    onRequest(context) {
      context.headers.set(LOCALE_HEADER, document.documentElement.lang);
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
