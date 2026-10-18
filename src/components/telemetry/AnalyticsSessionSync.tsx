"use client";

import { useEffect } from "react";
import { setAnalyticsSignedIn } from "@/lib/analytics/analytics";
import { accountUser, authClient } from "@/lib/auth-client";

/** Tells analytics whether an account is signed in; a guest session counts as signed out. */
export default function AnalyticsSessionSync() {
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(accountUser(session));

  useEffect(() => {
    setAnalyticsSignedIn(isSignedIn);
  }, [isSignedIn]);

  return null;
}
