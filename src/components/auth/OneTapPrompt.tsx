"use client";

import { useEffect } from "react";
import { SITE } from "@/config/site";
import { accountUser, authClient } from "@/lib/auth-client";

const DELAY_MS = 3000;

/**
 * Offers Google One Tap to a visitor without an account, a few seconds into the visit, while the
 * sign-in dialog is closed. Production only: Google accepts One Tap only from origins listed for
 * the client, and previews and localhost are not.
 */
export default function OneTapPrompt({ paused }: { paused: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(accountUser(session));

  useEffect(() => {
    if (paused || isPending || signedIn || window.location.host !== SITE.host) {
      return;
    }
    const id = window.setTimeout(() => {
      void authClient.oneTap({ callbackURL: window.location.href });
    }, DELAY_MS);
    return () => window.clearTimeout(id);
  }, [paused, isPending, signedIn]);

  return null;
}
