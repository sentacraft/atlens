"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { EllipsisVertical } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import Iris from "@/components/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { useCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { useNavLock } from "@/context/ScrollContainerContext";
import { usePwa } from "@/lib/usePwa";
import { cn } from "@/lib/utils";
import MountSwitcher from "@/components/MountSwitcher";
import GitHubMark from "@/components/logos/GitHubMark";

export default function Nav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { compareState } = useCompare();
  const effectiveMount = useEffectiveMount();
  const { navLocked, lockNav } = useNavLock();
  const isPwa = usePwa();
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu + reset scroll on navigation
  useEffect(() => {
    setHidden(false);
    setMobileMenuOpen(false);
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

  const compareIds = compareState[effectiveMount];
  const seg = mountToUrlSegment(effectiveMount);
  const browseHref = `/lenses/${seg}`;
  const compareHref = compareIds.length > 0
    ? `/lenses/${seg}/compare?ids=${compareIds.join(",")}`
    : `/lenses/${seg}/compare`;

  const linkCls = (active: boolean) =>
    `text-xs sm:text-sm transition-colors px-1.5 sm:px-2 ${
      active
        ? "text-zinc-900 dark:text-zinc-50 font-medium"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
    }`;

  const mobileLinkCls = (active: boolean) =>
    `block px-4 py-2.5 text-sm transition-colors ${
      active
        ? "text-zinc-900 dark:text-zinc-50 font-medium"
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
    }`;

  const isBrowseActive = pathname.startsWith("/lenses") && !pathname.includes("/compare");
  const isCompareActive = pathname.includes("/compare");
  const showMountSwitcher = pathname === "/" || pathname.startsWith("/lenses");

  return (
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
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
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
          <Link href={browseHref} className={linkCls(isBrowseActive)}>
            {t("lenses")}
          </Link>
          <Link href={compareHref} className={linkCls(isCompareActive)}>
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
        <div className="flex items-center sm:hidden gap-0.5">
          <Link href={browseHref} className={linkCls(isBrowseActive)}>
            {t("lenses")}
          </Link>
          <Link href={compareHref} className={linkCls(isCompareActive)}>
            {t("compare")}
          </Link>
          <a
            href="https://github.com/sentacraft/x-glass"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors px-1.5"
            aria-label="GitHub"
          >
            <GitHubMark />
          </a>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 -mr-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <EllipsisVertical className="h-5 w-5" />
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg shadow-zinc-950/10 py-1 overflow-hidden">
                <Link href="/about" className={mobileLinkCls(pathname === "/about")}>
                  {t("about")}
                </Link>
                {!isPwa && (
                  <Link href="/get" className={mobileLinkCls(pathname === "/get")}>
                    {t("getApp")}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
