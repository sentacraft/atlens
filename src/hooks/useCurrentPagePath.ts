"use client";

import { usePathname, useSearchParams } from "next/navigation";

/** The current path and query, kept current through client navigation and history.replaceState. */
export function useCurrentPagePath(): string {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return search ? `${pathname}?${search}` : pathname;
}
