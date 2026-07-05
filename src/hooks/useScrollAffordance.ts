"use client";

import { useEffect, useState, type DependencyList, type RefObject } from "react";

/**
 * Observe a scrolling container and report whether more content lies beyond each
 * edge of the current viewport, on both axes. Used to drive scroll affordances
 * (edge fade overlays, chevron buttons) that only show when there's somewhere to
 * scroll — avoids the "permanent edge vignette" look of an unconditional CSS
 * `mask-image` on a non-overflowing container, and keeps the fade an overlay so
 * it doesn't also fade the scrollbar.
 *
 * One hook covers both directions: a horizontal rail reads canScrollLeft/Right,
 * a vertical thread reads canScrollUp/Down; the unused axis just stays false.
 *
 * `deps` lets the caller signal that the container's content changed (e.g. a
 * flex-1 container whose own size is fixed but whose scrollable contents grew or
 * shrank — a plain ResizeObserver on the container won't fire in that case).
 *
 * The 4px epsilon on each edge absorbs subpixel rounding so a perfectly-
 * scrolled-to-edge container doesn't oscillate between "can/can't scroll".
 */
export function useScrollAffordance(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
) {
  const [state, setState] = useState({
    canScrollUp: false,
    canScrollDown: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    function update() {
      if (!el) {
        return;
      }
      const next = {
        canScrollUp: el.scrollTop > 4,
        canScrollDown: el.scrollTop < el.scrollHeight - el.clientHeight - 4,
        canScrollLeft: el.scrollLeft > 4,
        canScrollRight: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
      };
      // Bail when nothing changed. update() runs on every scroll and — via the deps —
      // on every streamed message; returning a fresh object each time would re-render
      // unconditionally, and under a fast stream (dozens of message writes in one
      // synchronous batch) those pile into a "Maximum update depth exceeded" loop.
      setState((prev) =>
        prev.canScrollUp === next.canScrollUp &&
        prev.canScrollDown === next.canScrollDown &&
        prev.canScrollLeft === next.canScrollLeft &&
        prev.canScrollRight === next.canScrollRight
          ? prev
          : next,
      );
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);

  return state;
}
