"use client";

import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { LogOut, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { accountUser, authClient } from "@/lib/auth-client";
import { ICON_NAV_BTN_CLS, MENU_POPUP_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useTestHookEnabled } from "@/context/TestHookProvider";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import Avatar from "@/components/auth/Avatar";

const MENU_ITEM_CLS =
  "flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

export default function AuthControl() {
  const t = useTranslations("Auth");
  const { data: session } = authClient.useSession();
  const testHookEnabled = useTestHookEnabled();
  const openSignIn = useSignInDialog();

  const user = accountUser(session);
  if (!testHookEnabled) {
    return null;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openSignIn()}
        aria-label={t("login")}
        className={cn(ICON_NAV_BTN_CLS, "h-8 gap-1.5 px-2 text-sm")}
      >
        <UserRound className="h-4 w-4" />
        <span className="hidden sm:inline">{t("login")}</span>
      </button>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("accountLabel")}
        className={cn(ICON_NAV_BTN_CLS, "h-8 w-8 rounded-full")}
      >
        <Avatar
          name={user.name}
          email={user.email}
          image={user.image}
          className="h-7 w-7 text-[11px]"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className={cn(MENU_POPUP_CLS, "w-64")}>
            <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <Avatar
                name={user.name}
                email={user.email}
                image={user.image}
                className="h-9 w-9 text-sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user.name || t("account")}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
            </div>
            <Menu.Item
              render={<Link href="/me" />}
              className={MENU_ITEM_CLS}
            >
              <UserRound className="h-4 w-4 shrink-0" />
              {t("profile")}
            </Menu.Item>
            <Menu.Item
              onClick={() => authClient.signOut()}
              className={MENU_ITEM_CLS}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("logout")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
