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
/**
 * Build a CSS `mask-image` value that fades the overflowing edges of a
 * horizontally-scrolling container — but only on the edges where there's
 * still content to scroll to. Returns `undefined` when both sides are
 * fully visible so the caller can omit the inline style entirely (no
 * mask is cheaper than a "no-op" mask).
 *
 * 4rem fade width gives a clear "there's more here" hint on small
 * surfaces (mobile compare bar chip row), while still leaving the
 * scroll-chevron buttons' visual weight a clear focal point on top.
 */
export function buildHorizontalScrollMask(
  canScrollLeft: boolean,
  canScrollRight: boolean,
): string | undefined {
  if (canScrollLeft && canScrollRight) {
    return "linear-gradient(to right, transparent, black 4rem, black calc(100% - 4rem), transparent)";
  }
  if (canScrollLeft) {
    return "linear-gradient(to right, transparent, black 4rem)";
  }
  if (canScrollRight) {
    return "linear-gradient(to right, black calc(100% - 4rem), transparent)";
  }
  return undefined;
}

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
