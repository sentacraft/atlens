"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import {
  ADMIN_ANALYTICS_PARAMS,
  ANALYTICS_RANGE_LABELS,
  ANALYTICS_RANGES,
  ANALYTICS_TABS,
  adminAnalyticsPath,
  analyticsTabOf,
  parseAnalyticsRange,
  type AnalyticsRange,
  type AnalyticsTab,
} from "@/lib/url/admin-analytics";

/**
 * The dashboard's sticky tab and range bar. Switching keeps the current page on screen, dimmed,
 * until the new data arrives; a range switch also keeps the scroll position.
 */
export default function AnalyticsFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const shownRange = parseAnalyticsRange(useSearchParams().get(ADMIN_ANALYTICS_PARAMS.range));
  const shownTab = analyticsTabOf(pathname) ?? "";
  const [pending, startTransition] = useTransition();
  // The choice being loaded is highlighted at once, so the click reads as taken.
  const [target, setTarget] = useState<{ tab: AnalyticsTab; range: AnalyticsRange } | null>(null);
  const { tab, range } = pending && target ? target : { tab: shownTab, range: shownRange };
  const currentTabRef = useRef<HTMLAnchorElement>(null);

  // On a phone the tab row scrolls sideways; keep the current tab in view.
  useEffect(() => {
    currentTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [shownTab]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, next: { tab: AnalyticsTab; range: AnalyticsRange }, keepScroll: boolean) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    setTarget(next);
    startTransition(() => router.push(adminAnalyticsPath(next.tab, next.range), { scroll: !keepScroll }));
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav aria-label="Dashboard pages" className="-mb-px flex gap-5 overflow-x-auto pt-3 [scrollbar-width:none]">
            {ANALYTICS_TABS.map((option) => {
              const href = adminAnalyticsPath(option.segment, range);
              const current = option.segment === tab;
              return (
                <Link
                  key={option.segment}
                  ref={current ? currentTabRef : undefined}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  onClick={(event) => navigate(event, { tab: option.segment, range }, false)}
                  className={`shrink-0 border-b-2 pb-2 text-sm whitespace-nowrap transition-colors ${
                    current ? "border-zinc-900 font-medium text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 py-2.5">
            <nav aria-label="Time range" className="flex flex-wrap gap-2">
              {ANALYTICS_RANGES.map((option) => {
                const href = adminAnalyticsPath(tab, option);
                const current = option === range;
                return (
                  <Link
                    key={option}
                    href={href}
                    scroll={false}
                    aria-current={current ? "true" : undefined}
                    onClick={(event) => navigate(event, { tab, range: option }, true)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      current ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {ANALYTICS_RANGE_LABELS[option]}
                  </Link>
                );
              })}
            </nav>
            <span role="status" aria-live="polite" className="ml-1 flex items-center gap-1.5 text-xs text-zinc-500">
              {pending && (
                <>
                  <svg viewBox="0 0 16 16" className="size-4 animate-spin" aria-hidden>
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
                    <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Loading
                </>
              )}
            </span>
          </div>
        </div>
      </div>
      <div aria-busy={pending} className={`transition-opacity duration-150 ${pending ? "pointer-events-none opacity-50" : ""}`}>
        {children}
      </div>
    </>
  );
}
