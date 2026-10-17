"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { useCompare } from "@/context/CompareProvider";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useBreakpoint } from "@/hooks/useViewport";
import { useNav } from "@/context/NavProvider";
import { usePwa } from "@/hooks/usePwa";
import { track } from "@/lib/analytics/analytics";
import { cn } from "@/lib/utils";
import MountSwitcher from "@/components/mount/MountSwitcher";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import GitHubMark from "@/components/logos/GitHubMark";
import NavMenu from "@/components/nav/NavMenu";
import { useOpenIris } from "@/context/IrisPanelProvider";
import AiTag from "@/components/iris/AiTag";
import { SITE } from "@/config/site";
import { ASK_IRIS_PATH, browsePath } from "@/lib/url/routes";
import { buildComparePath } from "@/lib/url/compare";
import { PAGE_GUTTER_CLS } from "@/config/ui-tokens";

export default function Nav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { compareIds } = useCompare();
  const clearCompareWithUndo = useClearCompareWithUndo();
  const effectiveMount = useEffectiveMount();
  const { navLocked, lockNav, setNavHidden } = useNav();
  const openIris = useOpenIris();
  const isPwa = usePwa();
  const [scrolledDown, setScrolledDown] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  // One Nav-level dialog, not FeedbackTrigger: the mobile menu unmounts on select, tearing down a
  // trigger-owned dialog before it opens.
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

  const browseHref = browsePath(effectiveMount);
  const compareHref = buildComparePath(effectiveMount, compareIds);

  const linkCls = (active: boolean) =>
    `text-sm transition-colors px-1.5 sm:px-2 ${
      active
        ? "text-zinc-900 dark:text-zinc-50 font-medium"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
    }`;

  const isBrowseActive = pathname.startsWith("/lenses") && !pathname.includes("/compare");
  const isCompareActive = pathname.includes("/compare");
  const isAskIrisActive = pathname.startsWith(ASK_IRIS_PATH);
  const showMountSwitcher = pathname === "/" || pathname.startsWith("/lenses");

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
      <nav className={`wco-no-drag max-w-7xl mx-auto h-14 flex items-center justify-between ${PAGE_GUTTER_CLS}`}>
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

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={browseHref} className={cn(linkCls(isBrowseActive), "whitespace-nowrap")}>
            {t("lenses")}
          </Link>
          <Link
            href={compareHref}
            onClick={handleCompareLinkClick}
            className={cn(linkCls(isCompareActive), "hidden whitespace-nowrap sm:inline")}
          >
            {t("compare")}
          </Link>
          <Link
            href={ASK_IRIS_PATH}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey) {
                return;
              }
              event.preventDefault();
              openIris();
            }}
            className={cn(linkCls(isAskIrisActive), "inline-flex items-center gap-1.5 whitespace-nowrap")}
          >
            {t("askIris")}
            <AiTag />
          </Link>
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
          <a
            href={SITE.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 sm:inline-flex dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <GitHubMark size={15} />
            GitHub
          </a>
          <NavMenu
            compareHref={compareHref}
            onCompareClick={handleCompareLinkClick}
            showGetApp={!isPwa}
            onFeedback={openFeedback}
          />
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
