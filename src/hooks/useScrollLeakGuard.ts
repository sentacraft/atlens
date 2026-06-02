import { useEffect, type RefObject } from "react";

// On iOS a touch drag started outside a scrollable region — or inside one that
// can't move any further — chains into a body scroll behind a fixed overlay.
// Base UI's modal scroll lock uses `overflow: hidden`, which doesn't stop touch
// panning, and CSS can't cover the gap on its own: `overscroll-behavior` only
// engages once an element is actually scrolling, and `touch-action: pan-y`
// actively hands the gesture to the nearest scrollable ancestor (the body) when
// the region itself can't scroll — exactly the empty-results case. So we
// swallow any touchmove the one real scroller can't consume.
export function useScrollLeakGuard(
  enabled: boolean,
  scrollableRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let startY = 0;

    function onTouchStart(event: TouchEvent) {
      startY = event.touches[0]?.clientY ?? 0;
    }

    function onTouchMove(event: TouchEvent) {
      const scroller = scrollableRef.current;
      const target = event.target as Node | null;
      // Anything outside the scroller (header, empty state) would leak.
      if (!scroller || !target || !scroller.contains(target)) {
        event.preventDefault();
        return;
      }

      const delta = startY - (event.touches[0]?.clientY ?? 0);
      const canScroll = scroller.scrollHeight > scroller.clientHeight;
      const atTop = scroller.scrollTop <= 0;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      // Block when the scroller can't take the gesture — not scrollable at all,
      // or already pinned at the edge it's being dragged past.
      if (!canScroll || (delta < 0 && atTop) || (delta > 0 && atBottom)) {
        event.preventDefault();
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [enabled, scrollableRef]);
}
