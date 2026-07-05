"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { EllipsisVertical, Flag, Info, Download } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { useCompare } from "@/context/CompareProvider";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useBreakpoint } from "@/hooks/useViewport";
import { mountToUrlSegment } from "@/lib/mount";
import { useNav } from "@/context/NavProvider";
import { usePwa } from "@/hooks/usePwa";
import { track } from "@/lib/analytics/analytics";
import { cn } from "@/lib/utils";
import { MENU_POPUP_CLS } from "@/config/ui-tokens";
import MountSwitcher from "@/components/mount/MountSwitcher";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import GitHubMark from "@/components/logos/GitHubMark";

export default function Nav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { compareIds } = useCompare();
  const clearCompareWithUndo = useClearCompareWithUndo();
  const effectiveMount = useEffectiveMount();
  const { navLocked, lockNav, setNavHidden } = useNav();
  const isPwa = usePwa();
  const [scrolledDown, setScrolledDown] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  // Both nav entries (desktop link + mobile menu item) open one Nav-level
  // dialog rather than going through FeedbackTrigger: the mobile menu unmounts
  // on select, which would tear down a trigger-owned dialog before it opens.
  // Route both through this one handler so they still fire the same
  // feedback_open event FeedbackTrigger does — no tracking gap.
  function openFeedback() {
    track("feedback_open", { feedback_type: "general" });
    setFeedbackOpen(true);
  }

  useEffect(() => {
    if (isPwa) {
      return;
    }
    const onScroll = () => {
      const y = window.scrollY;
      const threshold = headerRef.current?.offsetHeight ?? 56;
      if (y > lastScrollY.current && y > threshold) {
        setScrolledDown(true);
      } else if (y < lastScrollY.current) {
        setScrolledDown(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isPwa]);

  useEffect(() => {
    setScrolledDown(false);
    lastScrollY.current = 0;
    lockNav(false);
  }, [pathname, lockNav]);

  const isDesktop = useBreakpoint("sm");
  const hidden = !isPwa && !isDesktop && (scrolledDown || navLocked);
  useEffect(() => {
    setNavHidden(hidden);
  }, [hidden, setNavHidden]);

  const seg = mountToUrlSegment(effectiveMount);
  const browseHref = `/lenses/${seg}/browse`;
  const compareHref = compareIds.length > 0
    ? `/lenses/${seg}/compare?ids=${compareIds.join(",")}`
    : `/lenses/${seg}/compare`;

  const linkCls = (active: boolean) =>
    `text-sm transition-colors px-2 ${
      active
        ? "text-zinc-900 dark:text-zinc-50 font-medium"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
    }`;

  const mobileLinkCls = (active: boolean) =>
    `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
      active
        ? "text-zinc-900 dark:text-zinc-50 font-medium"
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
    }`;

  const isBrowseActive = pathname.startsWith("/lenses") && !pathname.includes("/compare");
  const isCompareActive = pathname.includes("/compare");
  const showMountSwitcher =
    pathname === "/" || pathname.startsWith("/lenses") || pathname.startsWith("/askiris");

  // When the user is *already on* the compare page and clicks the nav's
  // "对比" link, the intuitive read is "reset this comparison and start
  // fresh" — but plain navigation would just be a no-op. Intercept the
  // click and delegate to the shared clear-with-undo hook so the
  // destructive action stays reversible (and is consistent with the
  // other "清空" entry points on the bar and compare-page header).
  function handleCompareLinkClick(e: React.MouseEvent) {
    if (!isCompareActive || compareIds.length === 0) {
      return;
    }
    e.preventDefault();
    clearCompareWithUndo();
  }

  return (
    <>
    <header
      ref={headerRef}
      data-hidden={String(hidden)}
      className={cn(
        "wco-drag",
        "fixed top-0 inset-x-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black z-30",
        "transition-transform duration-300 ease-in-out",
        hidden && "-translate-y-full"
      )}
      style={{ paddingTop: "calc(var(--safe-inset-top) + var(--titlebar-height))" }}
    >
      <nav className="wco-no-drag max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: brand / mount-scope path (GitHub namespace pattern) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold font-heading text-zinc-900 dark:text-zinc-50 text-base sm:text-lg tracking-tight whitespace-nowrap"
            aria-label="Home"
          >
            <Iris config={IRIS_NAV} uid="nav" size={16} />
            Atlens
          </Link>
          {showMountSwitcher && (
            <>
              <span className="text-zinc-400 dark:text-zinc-600 select-none font-light text-base sm:text-lg px-0" aria-hidden="true">/</span>
              <MountSwitcher />
            </>
          )}
        </div>

        {/* Right: shared items + breakpoint-specific overflow */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={browseHref} className={linkCls(isBrowseActive)}>
            {t("lenses")}
          </Link>
          <Link href={compareHref} onClick={handleCompareLinkClick} className={linkCls(isCompareActive)}>
            {t("compare")}
          </Link>

          {/* Desktop-only links */}
          <Link href="/about" className={cn(linkCls(pathname === "/about"), "hidden sm:inline")}>
            {t("about")}
          </Link>
          {!isPwa && (
            <Link href="/get" className={cn(linkCls(pathname === "/get"), "hidden sm:inline")}>
              <span className="text-sm">{t("getApp")}</span>
            </Link>
          )}
          <button
            type="button"
            onClick={openFeedback}
            className={cn(linkCls(false), "hidden sm:inline")}
          >
            {t("feedback")}
          </button>
          <a
            href="https://github.com/sentacraft/atlens"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-zinc-900 dark:text-zinc-50 px-1"
            aria-label="GitHub"
          >
            <GitHubMark />
          </a>

          {/* Mobile-only overflow menu */}
          <Menu.Root>
            <Menu.Trigger
              aria-label="Menu"
              className="pl-1 pr-2 py-2 -mr-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors sm:hidden"
            >
              <EllipsisVertical className="h-5 w-5" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50 sm:hidden">
                <Menu.Popup className={cn(MENU_POPUP_CLS, "w-36")}>
                  <Menu.LinkItem
                    render={<Link href="/about" />}
                    className={mobileLinkCls(pathname === "/about")}
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    {t("about")}
                  </Menu.LinkItem>
                  {!isPwa && (
                    <Menu.LinkItem
                      render={<Link href="/get" />}
                      className={mobileLinkCls(pathname === "/get")}
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      {t("getApp")}
                    </Menu.LinkItem>
                  )}
                  <Menu.Item
                    onClick={openFeedback}
                    className={mobileLinkCls(false)}
                  >
                    <Flag className="h-4 w-4 shrink-0" />
                    {t("feedback")}
                  </Menu.Item>
                  <Menu.LinkItem
                    href="https://github.com/sentacraft/atlens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={mobileLinkCls(false)}
                  >
                    <GitHubMark size={16} className="shrink-0" />
                    GitHub
                  </Menu.LinkItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </nav>
    </header>

    <FeedbackDialog
      open={feedbackOpen}
      onOpenChange={setFeedbackOpen}
      type="general"
    />
    </>
  );
}
