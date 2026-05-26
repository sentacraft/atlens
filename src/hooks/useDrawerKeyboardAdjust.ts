import { type RefObject, useEffect } from "react";

const KB_THRESHOLD = 100;
const TOP_PEEK_DEFAULT = 48;

export function useDrawerKeyboardAdjust(
  popupRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLDivElement | null>,
  options: { topPeek?: number; open?: boolean } = {},
) {
  const { topPeek = TOP_PEEK_DEFAULT, open = false } = options;

  useEffect(() => {
    if (!open) {
      return;
    }

    const vv = window.visualViewport;
    const popup = popupRef.current;
    const scrollEl = scrollRef.current;
    if (!vv || !popup || !scrollEl) {
      return;
    }

    let rafId = 0;

    function update() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const kbHeight = Math.round(window.innerHeight - vv!.height);

        if (kbHeight > KB_THRESHOLD) {
          popup!.style.setProperty("bottom", `${kbHeight}px`);

          const popupTop = popup!.getBoundingClientRect().top;
          const scrollTop = scrollEl!.getBoundingClientRect().top;
          const headerHeight = scrollTop - popupTop;
          const available = Math.max(100, vv!.height - topPeek - headerHeight);
          scrollEl!.style.setProperty("height", `${available}px`);
        } else {
          popup!.style.removeProperty("bottom");
          scrollEl!.style.removeProperty("height");
        }
      });
    }

    vv.addEventListener("resize", update);
    update();

    return () => {
      cancelAnimationFrame(rafId);
      vv.removeEventListener("resize", update);
      popup.style.removeProperty("bottom");
      scrollEl.style.removeProperty("height");
    };
  }, [popupRef, scrollRef, topPeek, open]);
}
