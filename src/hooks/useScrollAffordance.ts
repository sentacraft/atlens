"use client";

import { useEffect, useState, type DependencyList, type RefObject } from "react";

// `deps` signals content changes a ResizeObserver on the container would miss.
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
      // A fresh object on every streamed message piles into "Maximum update depth exceeded".
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
