"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { accountUser, authClient } from "@/lib/auth-client";
import { writeLocalePreference } from "@/lib/locale-preference";
import { patchUserSettings, userSettingsQuery } from "@/lib/me/settings-client";
import type { UserSettings } from "@/lib/me/settings-schema";

/**
 * Switches the site's language and stays on the page. A signed-in visitor's choice is saved to
 * their account; a guest's lasts the browser session, in next-intl's own locale cookie.
 */
export function useSwitchLocale(): (next: Locale) => void {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("Profile");
  const { data: session } = authClient.useSession();
  const userId = accountUser(session)?.id;

  return (next) => {
    if (next === locale) {
      return;
    }
    if (userId) {
      const { queryKey } = userSettingsQuery(userId);
      // Before navigating: the middleware sends a signed-in visitor back to the language in this cookie.
      writeLocalePreference(next);
      queryClient.setQueryData<UserSettings>(queryKey, (previous) => previous && { ...previous, locale: next });
      patchUserSettings({ locale: next })
        .then((saved) => queryClient.setQueryData(queryKey, saved))
        .catch(() => {
          toast.error(t("saveError"));
          void queryClient.invalidateQueries({ queryKey });
        });
    }
    router.replace(`${pathname}${window.location.search}`, { locale: next });
  };
}
