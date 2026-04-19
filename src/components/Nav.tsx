"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Smartphone } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import LensSearchDialog from "@/components/LensSearchDialog";
import Iris from "@/components/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { useCompare } from "@/context/CompareProvider";
import { useNavLock } from "@/context/ScrollContainerContext";
import { usePwa } from "@/lib/usePwa";
import { cn } from "@/lib/utils";

export default function Nav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { compareIds } = useCompare();
  const { navLocked, lockNav } = useNavLock();
  const isPwa = usePwa();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  // Hide on scroll-down, reveal on scroll-up (mobile only — sm: always visible via CSS).
  // In PWA mode the nav is always pinned, so skip the scroll listener entirely.
  // Threshold is derived from the header's actual rendered height so it stays
  // in sync if the nav height ever changes.
  useEffect(() => {
    if (isPwa) return;
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

  // Always reveal when navigating to a new page, and release any nav lock.
  useEffect(() => {
    setHidden(false);
    lastScrollY.current = 0;
    lockNav(false);
  }, [pathname, setHidden, lockNav]);

  // When the nav lock is released, immediately snap nav back to visible.
  useEffect(() => {
    if (!navLocked) setHidden(false);
  }, [navLocked]);

  const compareHref =
    compareIds.length > 0
      ? `/lenses/compare?ids=${compareIds.join(",")}`
      : "/lenses/compare";

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
      {/* wco-no-drag: nav links must remain clickable inside the drag region */}
      <nav className="wco-no-drag max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-bold font-heading text-zinc-900 dark:text-zinc-50 text-lg tracking-tight"
        >
          <Iris config={IRIS_NAV} uid="nav" size={16} />
          X-Glass
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/lenses"
            className={`text-sm transition-colors ${
              pathname === "/lenses" ||
              (pathname.startsWith("/lenses/") && !pathname.startsWith("/lenses/compare"))
                ? "text-zinc-900 dark:text-zinc-50 font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {t("lenses")}
          </Link>
          <Link
            href={compareHref}
            className={`text-sm transition-colors ${
              pathname.startsWith("/lenses/compare")
                ? "text-zinc-900 dark:text-zinc-50 font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {t("compare")}
          </Link>
          <Link
            href="/about"
            className={`text-sm transition-colors ${
              pathname === "/about"
                ? "text-zinc-900 dark:text-zinc-50 font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {t("about")}
          </Link>
          {!isPwa && (
            <Link
              href="/get"
              aria-label={t("getApp")}
              className={`transition-colors ${
                pathname === "/get"
                  ? "text-zinc-900 dark:text-zinc-50 font-medium"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              <Smartphone width={17} height={17} className="sm:hidden" />
              <span className="hidden sm:inline text-sm">{t("getApp")}</span>
            </Link>
          )}
          <a
            href="https://github.com/ericzeyuzhang/x-glass"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </nav>
    </header>
  );
}
