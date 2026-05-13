"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useMountedCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * Projects the current compare state onto the address bar for the compare
 * page surface — and only the compare page.
 *
 * Two-way sync, two boundaries:
 *
 *   URL → context: `CompareTable.useLayoutEffect` re-runs when the server-
 *     supplied `initialLensIds` prop changes (i.e., after an RSC commit
 *     produced by `router.replace` / preset link clicks). That effect calls
 *     `replaceCompare(initialLensIds)`, seeding context from the URL.
 *
 *   context → URL: this hook. When the user mutates the comparison
 *     (add / remove / shift / clear), context updates and we project it
 *     back to the address bar via `window.history.replaceState` — no RSC
 *     round-trip, the URL stays shareable.
 *
 * The race we have to dodge: after a `router.replace`, `useSearchParams`
 * notifies subscribers synchronously, but the new `initialLensIds` server
 * prop doesn't arrive until the RSC payload commits some moments later.
 * If we naively re-projected context to the URL in that window, we'd see
 * the new search params but the old context, conclude the user "cleared
 * the ids", and clobber the URL with `?preset=X` (no ids). The next
 * useEffect run would then bounce things back, leading to either a flicker
 * or a real loop.
 *
 * `lastSyncedIdsRef` lets us tell apart "URL just navigated, wait for the
 * seed" from "context just mutated, write the URL". On every effect run we
 * read the URL's current `ids` value; if it disagrees with both context
 * AND the last value we synced, the URL is ahead of us — defer. The next
 * run, after `useLayoutEffect` seeds context, will find context matching
 * URL and either no-op via the guard at the bottom, or write the canonical
 * URL.
 */
export function useCompareUrlSync() {
  const { compareIds } = useMountedCompare();
  const mount = useEffectiveMount();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const urlIds = searchParams.get("ids");
  const preset = searchParams.get("preset");
  const from = searchParams.get("from");
  const lensId = searchParams.get("lensId");

  const lastSyncedIdsRef = useRef<string | null>(null);

  useEffect(() => {
    const stateIds = compareIds.length > 0 ? compareIds.join(",") : null;

    // Defer the URL write when the URL just changed to ids the context
    // hasn't caught up to yet — see the JSDoc above. Update the ref so
    // we don't re-defer on every re-render for the same URL.
    if (urlIds !== lastSyncedIdsRef.current && urlIds !== null && urlIds !== stateIds) {
      lastSyncedIdsRef.current = urlIds;
      return;
    }

    const seg = mountToUrlSegment(mount);
    const parts: string[] = [];
    if (stateIds) {
      parts.push(`ids=${stateIds}`);
    }
    if (preset) {
      parts.push(`preset=${encodeURIComponent(preset)}`);
    }
    if (from) {
      parts.push(`from=${encodeURIComponent(from)}`);
    }
    if (lensId) {
      parts.push(`lensId=${encodeURIComponent(lensId)}`);
    }
    const qs = parts.join("&");
    const path = `/${locale}/lenses/${seg}/compare`;
    const url = qs ? `${path}?${qs}` : path;

    lastSyncedIdsRef.current = stateIds;

    // No-op when nothing changed. Without this guard, an extra
    // replaceState would re-emit a router event for an already-correct URL.
    if (window.location.pathname + window.location.search === url) {
      return;
    }
    window.history.replaceState(null, "", url);
  }, [compareIds, mount, locale, urlIds, preset, from, lensId]);
}
