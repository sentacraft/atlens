"use client";

import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { Columns2, Download, Flag, Info, LogIn, LogOut, Menu as MenuIcon, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { accountUser, authClient } from "@/lib/auth-client";
import { MENU_ITEM_CLS, MENU_POPUP_CLS, NAV_CAPSULE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useTestHookEnabled } from "@/context/TestHookProvider";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import Avatar from "@/components/auth/Avatar";
import GitHubMark from "@/components/logos/GitHubMark";
import { SITE } from "@/config/site";
import { ABOUT_PATH, GET_APP_PATH, PROFILE_PATH } from "@/lib/url/routes";

const SEPARATOR_CLS = "my-1 h-px bg-zinc-200 dark:bg-zinc-800";

/** The nav's one menu: the account, the pages the bar has no room for, and feedback. */
export default function NavMenu({
  compareHref,
  onCompareClick,
  showGetApp,
  onFeedback,
}: {
  compareHref: string;
  onCompareClick: (event: React.MouseEvent) => void;
  showGetApp: boolean;
  onFeedback: () => void;
}) {
  const tNav = useTranslations("Nav");
  const t = useTranslations("Auth");
  const { data: session } = authClient.useSession();
  const accountsEnabled = useTestHookEnabled();
  const openSignIn = useSignInDialog();
  const user = accountsEnabled ? accountUser(session) : null;

  return (
    <Menu.Root>
      <Menu.Trigger aria-label={tNav("menu")} className={cn(NAV_CAPSULE_CLS, !accountsEnabled && "pr-3")}>
        <MenuIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
        {user ? (
          <Avatar name={user.name} email={user.email} image={user.image} className="h-7 w-7 text-[11px]" />
        ) : accountsEnabled ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <UserRound className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </span>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup className={cn(MENU_POPUP_CLS, "w-64 py-1")}>
            {user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={user.name} email={user.email} image={user.image} className="h-9 w-9 text-sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {user.name || t("account")}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                  </div>
                </div>
                <Menu.Item render={<Link href={PROFILE_PATH} />} className={MENU_ITEM_CLS}>
                  <UserRound className="h-4 w-4 shrink-0" />
                  {t("profile")}
                </Menu.Item>
                <div className={SEPARATOR_CLS} />
              </>
            ) : accountsEnabled ? (
              <>
                <Menu.Item onClick={() => openSignIn()} className={cn(MENU_ITEM_CLS, "items-start")}>
                  <LogIn className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{t("login")}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{tNav("signInHint")}</span>
                  </span>
                </Menu.Item>
                <div className={SEPARATOR_CLS} />
              </>
            ) : null}
            <Menu.Item render={<Link href={compareHref} />} onClick={onCompareClick} className={cn(MENU_ITEM_CLS, "sm:hidden")}>
              <Columns2 className="h-4 w-4 shrink-0" />
              {tNav("compare")}
            </Menu.Item>
            <Menu.Item render={<Link href={ABOUT_PATH} />} className={MENU_ITEM_CLS}>
              <Info className="h-4 w-4 shrink-0" />
              {tNav("about")}
            </Menu.Item>
            {showGetApp && (
              <Menu.Item render={<Link href={GET_APP_PATH} />} className={MENU_ITEM_CLS}>
                <Download className="h-4 w-4 shrink-0" />
                {tNav("getApp")}
              </Menu.Item>
            )}
            <Menu.Item onClick={onFeedback} className={MENU_ITEM_CLS}>
              <Flag className="h-4 w-4 shrink-0" />
              {tNav("feedback")}
            </Menu.Item>
            <Menu.Item
              render={<a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer" />}
              className={cn(MENU_ITEM_CLS, "sm:hidden")}
            >
              <GitHubMark size={16} className="shrink-0" />
              GitHub
            </Menu.Item>
            {user && (
              <>
                <div className={SEPARATOR_CLS} />
                <Menu.Item onClick={() => authClient.signOut()} className={MENU_ITEM_CLS}>
                  <LogOut className="h-4 w-4 shrink-0" />
                  {t("logout")}
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
