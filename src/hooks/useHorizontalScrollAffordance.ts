"use client";

import { useEffect, useState, type DependencyList, type RefObject } from "react";

/**
 * Observe a horizontally-scrolling container and report whether more content
 * lies to the left or right of the current viewport. Used to drive scroll
 * affordances (edge gradients, chevron buttons) that only show when there's
 * actually somewhere to scroll to — avoids the "permanent edge vignette"
 * look of an unconditional CSS `mask-image` on a non-overflowing container.
 *
 * `deps` lets the caller signal that the container's content changed (e.g.
 * a flex-1 container whose own size is fixed but whose scrollable contents
 * grew or shrank — a plain ResizeObserver on the container won't fire in
 * that case). Pass the same kind of "what's inside" signal you would pass
 * to a useEffect dep array.
 *
 * The 4px epsilon on each side absorbs subpixel rounding so a perfectly-
 * scrolled-to-edge container doesn't oscillate between "can/can't scroll".
 */
export function useHorizontalScrollAffordance(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    function update() {
      if (!el) {
        return;
      }
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
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

  return { canScrollLeft, canScrollRight };
}
