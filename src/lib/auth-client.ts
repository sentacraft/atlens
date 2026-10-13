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
