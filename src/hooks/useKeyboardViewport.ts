"use client";

import { useEffect } from "react";

/**
 * Mirrors the on-screen keyboard height onto a `:root` CSS var
 * (`--keyboard-height`) so a fixed surface can pad its scroll content above the
 * keyboard. This is the minimal hand-rolled equivalent of what dedicated sheet
 * libraries (vaul, react-modal-sheet) do internally.
 *
 * Why JS is unavoidable on iOS: the keyboard does NOT shrink the layout
 * viewport or any CSS unit (vh/svh/dvh) — only `window.visualViewport`. A fixed
 * element is detached from document flow, so the browser's native
 * scroll-the-input-into-view does not apply to it; we approximate it here.
 *
 * Ceiling (intentional): this only captures `innerHeight - visualViewport`,
 * i.e. the keyboard body. It does NOT cover the iOS input-accessory bar (工具条)
 * or Safari's keyboard URL bar (地址条) — those aren't reflected in
 * visualViewport. The carrier compensates by being full-height with a single
 * whole-sheet scroll, so the bottom content can be scrolled clear of them.
 *
 * Written to `:root` (not a ref) to avoid mount/ref-timing races; read via
 * plain CSS: `padding-bottom: var(--keyboard-height, 0px)`. Pass `active` so the
 * listeners only run while the surface is open.
 */
export function useKeyboardViewport(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }
    const root = document.documentElement;
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--keyboard-height", `${overlap}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      root.style.removeProperty("--keyboard-height");
    };
  }, [active]);
}
