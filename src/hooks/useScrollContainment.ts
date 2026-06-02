import { useEffect, type RefObject } from "react";

// With the body pinned (useBodyScrollLock), iOS stops routing touch gestures to
// the inner scroller on its own, and any drag outside it would chain to the
// body. This capture-phase guard is the counterpart to the lock: it lets the
// one real scroller keep its gesture (when it can actually move in that
// direction) and swallows everything else — header, empty state, and the edges
// where the scroller is already pinned. Mirrors react-aria's preventScroll
// approach, which Codex's version was based on.
function canConsume(scroller: HTMLElement | null, deltaY: number) {
  if (!scroller || Math.abs(deltaY) < 1) {
    return false;
  }
  const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;
  if (maxScrollTop <= 1) {
    return false;
  }
  // deltaY < 0 drags content down (reveal top); > 0 reveals bottom.
  return deltaY < 0 ? scroller.scrollTop > 0 : scroller.scrollTop < maxScrollTop - 1;
}

export function useScrollContainment(
  enabled: boolean,
  scrollableRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let lastY: number | null = null;

    function scrollerFor(node: EventTarget | null) {
      const scroller = scrollableRef.current;
      return scroller && node instanceof Node && scroller.contains(node)
        ? scroller
        : null;
    }

    function blockLeak(event: Event, deltaY: number) {
      if (!canConsume(scrollerFor(event.target), deltaY)) {
        event.preventDefault();
      }
    }

    function onWheel(event: WheelEvent) {
      blockLeak(event, event.deltaY);
    }

    function onTouchStart(event: TouchEvent) {
      lastY = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event: TouchEvent) {
      const currentY = event.touches[0]?.clientY ?? null;
      if (lastY === null || currentY === null) {
        event.preventDefault();
        return;
      }
      blockLeak(event, lastY - currentY);
      lastY = currentY;
    }

    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    return () => {
      document.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
    };
  }, [enabled, scrollableRef]);
}
