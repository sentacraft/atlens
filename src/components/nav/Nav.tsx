"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { useNavLinks } from "@/hooks/useNavLinks";
import { useBreakpoint } from "@/hooks/useViewport";
import { useNav } from "@/context/NavProvider";
import { usePwa } from "@/hooks/usePwa";
import { track } from "@/lib/analytics/analytics";
import { cn } from "@/lib/utils";
import MountSwitcher from "@/components/mount/MountSwitcher";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import GitHubMark from "@/components/logos/GitHubMark";
import NavMenu from "@/components/nav/NavMenu";
import TabBar from "@/components/nav/TabBar";
import { useIris } from "@/context/IrisPanelProvider";
import AiTag from "@/components/iris/AiTag";
import { SITE } from "@/config/site";
import { PAGE_GUTTER_CLS } from "@/config/ui-tokens";

export default function Nav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { section, browseHref, chartsHref } = useNavLinks();
  const { navLocked, lockNav, setNavHidden } = useNav();
  const { openIris, closeIris, irisShown } = useIris();
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

  const linkCls = (active: boolean) =>
    `text-sm transition-colors px-1.5 sm:px-2 ${
      active
        ? "text-zinc-900 font-medium"
        : "text-zinc-500 hover:text-zinc-900"
    }`;

  const showMountSwitcher = pathname === "/" || pathname.startsWith("/lenses");

  function trackBar(item: string) {
    track("nav_click", { item, place: "bar" });
  }

  return (
    <>
    <header
      ref={headerRef}
      data-hidden={String(hidden)}
      className={cn(
        "wco-drag",
        "fixed top-0 inset-x-0 border-b border-zinc-200 bg-white z-30",
        "transition-transform duration-300 ease-in-out",
        hidden && "-translate-y-full"
      )}
      style={{ paddingTop: "calc(var(--safe-inset-top) + var(--titlebar-height))" }}
    >
      <nav className={`wco-no-drag max-w-7xl mx-auto h-14 flex items-center justify-between ${PAGE_GUTTER_CLS}`}>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link
            href="/"
            onClick={() => trackBar("home")}
            className="flex items-center gap-1.5 font-bold font-heading text-zinc-900 text-base sm:text-lg tracking-tight whitespace-nowrap"
            aria-label="Home"
          >
            <Iris config={IRIS_NAV} uid="nav" size={16} />
            Atlens
          </Link>
          {showMountSwitcher && (
            <>
              <span className="text-zinc-400 select-none font-light text-base sm:text-lg px-0" aria-hidden="true">/</span>
              <MountSwitcher />
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={browseHref} onClick={() => trackBar("lenses")} className={cn(linkCls(section === "lenses"), "hidden whitespace-nowrap sm:inline")}>
            {t("lenses")}
          </Link>
          <Link href={chartsHref} onClick={() => trackBar("charts")} className={cn(linkCls(section === "charts"), "hidden whitespace-nowrap sm:inline")}>
            {t("charts")}
          </Link>
          <a
            href={SITE.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("starOnGitHub")}
            onClick={() => trackBar("github")}
            className={cn(linkCls(false), "hidden items-center gap-1.5 whitespace-nowrap sm:inline-flex")}
          >
            <GitHubMark size={15} />
            {t("github")}
          </a>
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block" />
          <button
            type="button"
            aria-pressed={irisShown}
            onClick={() => {
              trackBar("iris");
              if (irisShown) {
                closeIris();
              } else {
                openIris({ from: "nav" });
              }
            }}
            className={cn(
              "relative mr-1.5 hidden h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[13px] font-medium text-zinc-900 transition-colors sm:inline-flex",
              irisShown ? "border-zinc-400 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50",
            )}
          >
            <Iris config={IRIS_NAV} uid="nav-ask" size={15} />
            {t("askIris")}
            <span className="absolute -top-2 -right-2.5 rounded bg-white ring-2 ring-white">
              <AiTag />
            </span>
          </button>
          <NavMenu showGetApp={!isPwa} onFeedback={openFeedback} />
        </div>
      </nav>
    </header>

    <TabBar />

    <FeedbackDialog
      open={feedbackOpen}
      onOpenChange={setFeedbackOpen}
      type="general"
    />
    </>
  );
}
