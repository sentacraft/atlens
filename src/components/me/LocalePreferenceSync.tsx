"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountUser, authClient } from "@/lib/auth-client";
import { writeLocalePreference } from "@/lib/me/locale-preference";
import { userSettingsQuery } from "@/lib/me/settings-client";
import { useMountParam } from "@/hooks/useMountParam";
import { useMountPreference } from "@/context/MountPreferenceProvider";

/** Applies a signed-in account's settings where the URL leaves the choice open. */
export default function AccountPreferencesSync() {
  const { data: session, isPending } = authClient.useSession();
  const userId = accountUser(session)?.id;
  const { data: settings } = useQuery({ ...userSettingsQuery(userId ?? ""), enabled: Boolean(userId) });
  const urlMount = useMountParam();
  const { setPreference } = useMountPreference();
  const mountAppliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) {
      return;
    }
    if (!userId) {
      writeLocalePreference(null);
    } else if (settings) {
      writeLocalePreference(settings.locale);
    }
  }, [isPending, userId, settings]);

  useEffect(() => {
    if (!userId || !settings || mountAppliedFor.current === userId) {
      return;
    }
    mountAppliedFor.current = userId;
    if (!urlMount) {
      setPreference(settings.defaultMount);
    }
  }, [userId, settings, urlMount, setPreference]);

  return null;
}
