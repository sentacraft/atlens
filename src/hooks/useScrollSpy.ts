"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CLICK_SCROLL_LOCK_MS = 800;

/**
 * Tracks which section the reader is in: the last one whose top has passed 35% of the
 * viewport, or the last section once a scrolled page reaches the bottom. Above the first
 * section it is the first id, or, with `topSentinelId`, null while that element is in view.
 */
export function useScrollSpy(
  ids: readonly string[],
  { topSentinelId }: { topSentinelId?: string } = {},
) {
  const [activeId, setActiveId] = useState<string | null>(topSentinelId ? null : (ids[0] ?? null));
  const isClickScrolling = useRef(false);

  useEffect(() => {
    function pickActive() {
      if (isClickScrolling.current) {
        return;
      }

      const topEl = topSentinelId ? document.getElementById(topSentinelId) : null;
      if (topEl && topEl.getBoundingClientRect().bottom > 0) {
        setActiveId(null);
        return;
      }

      // A page that fits the viewport is "at the bottom" while still at the top.
      const atBottom =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom && ids.length > 0) {
        setActiveId(ids[ids.length - 1]);
        return;
      }

      const threshold = window.innerHeight * 0.35;
      let best: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          best = id;
        }
      }
      if (best) {
        setActiveId(best);
      } else if (!topSentinelId && ids.length > 0) {
        setActiveId(ids[0]);
      }
    }

    pickActive();
    window.addEventListener("scroll", pickActive, { passive: true });
    return () => window.removeEventListener("scroll", pickActive);
  }, [ids, topSentinelId]);

  /** Scrolls to a section (null: the page top) and holds that highlight while the scroll runs. */
  const scrollTo = useCallback((id: string | null) => {
    setActiveId(id);
    isClickScrolling.current = true;
    if (id === null) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setTimeout(() => {
      isClickScrolling.current = false;
    }, CLICK_SCROLL_LOCK_MS);
  }, []);

  return { activeId, scrollTo };
}
