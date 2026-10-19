"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/analytics";

/** One page_view per route; in-app navigations carry the page they came from. */
export default function PageViewTelemetry() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Strict Mode runs effects twice in development; one route is one view.
    if (pathname === lastPath.current) {
      return;
    }
    const fromPath = lastPath.current;
    lastPath.current = pathname;
    track("page_view", fromPath ? { from_path: fromPath } : { referrer: document.referrer || undefined });
  }, [pathname]);

  return null;
}
