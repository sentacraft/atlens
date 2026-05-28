"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, EllipsisVertical, Send, Info, Download } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import Iris from "@/components/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { useCompare } from "@/context/CompareProvider";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { useNavLock } from "@/context/ScrollContainerContext";
import { usePwa } from "@/lib/usePwa";
import { cn } from "@/lib/utils";
import { DROPDOWN_TITLE_CLS, DROPDOWN_CAPTION_CLS } from "@/lib/ui-tokens";
import MountSwitcher from "@/components/MountSwitcher";
import FeedbackDialog from "@/components/FeedbackDialog";
import GitHubMark from "@/components/logos/GitHubMark";

export default function Nav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { compareIds } = useCompare();
  const clearCompareWithUndo = useClearCompareWithUndo();
  const effectiveMount = useEffectiveMount();
  const { navLocked, lockNav } = useNavLock();
  const isPwa = usePwa();
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lensesMenuOpen, setLensesMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lensesDesktopRef = useRef<HTMLDivElement>(null);
  const lensesMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPwa) {
      return;
    }
    const onScroll = () => {
      const y = window.scrollY;
      const threshold = headerRef.current?.offsetHeight ?? 56;
      if (y > lastScrollY.current && y > threshold) {
        setHidden(true);
      } else if (y < lastScrollY.current) {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isPwa]);

  // Close menus + reset scroll on navigation
  useEffect(() => {
    setHidden(false);
    setMobileMenuOpen(false);
    setLensesMenuOpen(false);
    lastScrollY.current = 0;
    lockNav(false);
  }, [pathname, setHidden, lockNav]);

  useEffect(() => {
    if (!navLocked) {
      setHidden(false);
    }
  }, [navLocked]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobileMenuOpen]);

  // Close lenses dropdown on outside click or Escape
  useEffect(() => {
    if (!lensesMenuOpen) {
      return;
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !lensesDesktopRef.current?.contains(target) &&
        !lensesMobileRef.current?.contains(target)
      ) {
        setLensesMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLensesMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [lensesMenuOpen]);

  const seg = mountToUrlSegment(effectiveMount);
  const browseHref = `/lenses/${seg}`;
  const collectionsHref = `/lenses/${seg}/collections`;
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
  const isCollectionsActive = pathname.includes("/collections");
  const isCompareActive = pathname.includes("/compare");
  const showMountSwitcher = pathname === "/" || pathname.startsWith("/lenses");

  function toggleLensesMenu() {
    setLensesMenuOpen((v) => {
      if (!v) {
        setMobileMenuOpen(false);
      }
      return !v;
    });
  }

  const lensesDropdownPanel = (
    <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg shadow-zinc-950/10 py-1 overflow-hidden">
      <Link
        href={browseHref}
        onClick={() => setLensesMenuOpen(false)}
        className="block px-4 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <span className={cn("text-sm text-zinc-900 dark:text-zinc-50", DROPDOWN_TITLE_CLS)}>
          {t("allLenses")}
        </span>
        <span className={cn("block", DROPDOWN_CAPTION_CLS)}>
          {t("allLensesHint")}
        </span>
      </Link>
      <Link
        href={collectionsHref}
        onClick={() => setLensesMenuOpen(false)}
        className="block px-4 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <span className={cn("text-sm text-zinc-900 dark:text-zinc-50", DROPDOWN_TITLE_CLS)}>
          {t("collections")}
        </span>
        <span className={cn("block", DROPDOWN_CAPTION_CLS)}>
          {t("collectionsHint")}
        </span>
      </Link>
    </div>
  );

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
    setMobileMenuOpen(false);
    clearCompareWithUndo();
  }

  return (
    <>
    <header
      ref={headerRef}
      data-hidden={String(!isPwa && (hidden || navLocked))}
      className={cn(
        "wco-drag",
        "fixed top-0 inset-x-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black z-30",
        "transition-transform duration-300 ease-in-out",
        !isPwa && (hidden || navLocked) && "-translate-y-full sm:translate-y-0"
      )}
      style={{ paddingTop: "calc(var(--safe-inset-top) + var(--titlebar-height))" }}
    >
      <nav className="wco-no-drag max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: brand / mount-scope path (GitHub namespace pattern) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold font-heading text-zinc-900 dark:text-zinc-50 text-base sm:text-lg tracking-tight hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors whitespace-nowrap"
            aria-label="Home"
          >
            <Iris config={IRIS_NAV} uid="nav" size={16} />
            X-Glass
          </Link>
          {showMountSwitcher && (
            <>
              <span className="text-zinc-400 dark:text-zinc-600 select-none font-light text-base sm:text-lg px-0" aria-hidden="true">/</span>
              <MountSwitcher />
            </>
          )}
        </div>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-2">
          <div ref={lensesDesktopRef} className="relative">
            <button
              type="button"
              onClick={toggleLensesMenu}
              className={cn(linkCls(isBrowseActive), "inline-flex items-center gap-0.5")}
              aria-expanded={lensesMenuOpen}
            >
              {t("lenses")}
              <ChevronDown className={cn("size-3 transition-transform duration-150", lensesMenuOpen && "rotate-180")} />
            </button>
            {lensesMenuOpen && lensesDropdownPanel}
          </div>
          <Link href={compareHref} onClick={handleCompareLinkClick} className={linkCls(isCompareActive)}>
            {t("compare")}
          </Link>
          <Link href="/about" className={linkCls(pathname === "/about")}>
            {t("about")}
          </Link>
          {!isPwa && (
            <Link
              href="/get"
              className={linkCls(pathname === "/get")}
            >
              <span className="text-sm">{t("getApp")}</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className={linkCls(false)}
          >
            {t("feedback")}
          </button>
          <a
            href="https://github.com/sentacraft/x-glass"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors px-1"
            aria-label="GitHub"
          >
            <GitHubMark />
          </a>
        </div>

        {/* Mobile: primary links inline + secondary in overflow menu */}
        <div className="flex items-center sm:hidden gap-1">
          <div ref={lensesMobileRef} className="relative">
            <button
              type="button"
              onClick={toggleLensesMenu}
              className={cn(linkCls(isBrowseActive), "inline-flex items-center gap-0.5")}
              aria-expanded={lensesMenuOpen}
            >
              {t("lenses")}
              <ChevronDown className={cn("size-3 transition-transform duration-150", lensesMenuOpen && "rotate-180")} />
            </button>
            {lensesMenuOpen && lensesDropdownPanel}
          </div>
          <Link href={compareHref} onClick={handleCompareLinkClick} className={linkCls(isCompareActive)}>
            {t("compare")}
          </Link>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => {
                setMobileMenuOpen((v) => {
                  if (!v) {
                    setLensesMenuOpen(false);
                  }
                  return !v;
                });
              }}
              className="pl-1 pr-2 py-2 -mr-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <EllipsisVertical className="h-5 w-5" />
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg shadow-zinc-950/10 py-1 overflow-hidden">
                <Link href="/about" className={mobileLinkCls(pathname === "/about")}>
                  <Info className="h-4 w-4 shrink-0" />
                  {t("about")}
                </Link>
                {!isPwa && (
                  <Link href="/get" className={mobileLinkCls(pathname === "/get")}>
                    <Download className="h-4 w-4 shrink-0" />
                    {t("getApp")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); setFeedbackOpen(true); }}
                  className={mobileLinkCls(false) + " w-full text-left"}
                >
                  <Send className="h-4 w-4 shrink-0" />
                  {t("feedback")}
                </button>
                <a
                  href="https://github.com/sentacraft/x-glass"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={mobileLinkCls(false)}
                  aria-label="GitHub"
                >
                  <GitHubMark size={16} className="shrink-0" />
                  GitHub
                </a>
              </div>
            )}
          </div>
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
