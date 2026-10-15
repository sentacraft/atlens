"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountUser, authClient } from "@/lib/auth-client";
import { writeLocalePreference } from "@/lib/locale-preference";
import { userSettingsQuery } from "@/lib/me/settings-client";

/** Keeps the saved-language cookie in step with the signed-in account; guests have none. */
export default function LocalePreferenceSync() {
  const { data: session, isPending } = authClient.useSession();
  const userId = accountUser(session)?.id;
  const { data: settings } = useQuery({ ...userSettingsQuery(userId ?? ""), enabled: Boolean(userId) });

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

  return null;
}
