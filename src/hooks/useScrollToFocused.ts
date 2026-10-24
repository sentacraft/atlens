"use client";

import { useEffect, type RefObject } from "react";

/** Brings the focused lens inside `container` to the middle of the screen, scrolling a sideways rail too. */
export function useScrollToFocused(container: RefObject<HTMLElement | null>, lensId: string | undefined) {
  useEffect(() => {
    if (!lensId) {
      return;
    }
    const marked = container.current?.querySelectorAll<HTMLElement>("[data-focused]") ?? [];
    const visible = [...marked].find((el) => el.getClientRects().length > 0);
    visible?.scrollIntoView({ block: "center", inline: "center" });
  }, [container, lensId]);
}
