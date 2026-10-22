"use client";

import { useRef, useState } from "react";

/**
 * Which lens's card a chart shows. Mouse users get it on hover; touch has no hover, so the first tap
 * shows it and a second tap on the same lens follows its link. `onShow` receives the lens element
 * whenever its card appears, for charts that place the card beside it.
 */
export function useChartCard(onShow?: (el: HTMLElement) => void) {
  const [active, setActive] = useState<string>();
  const lastPointer = useRef("mouse");

  const show = (id: string, el: HTMLElement) => {
    setActive(id);
    onShow?.(el);
  };

  const itemHandlers = (id: string) => ({
    onPointerDown: (ev: React.PointerEvent) => {
      lastPointer.current = ev.pointerType;
    },
    onPointerEnter: (ev: React.PointerEvent<HTMLElement>) => {
      if (ev.pointerType === "mouse") {
        show(id, ev.currentTarget);
      }
    },
    onPointerLeave: (ev: React.PointerEvent) => {
      if (ev.pointerType === "mouse") {
        setActive(undefined);
      }
    },
    onClick: (ev: React.MouseEvent<HTMLElement>) => {
      if (lastPointer.current !== "mouse" && active !== id) {
        ev.preventDefault();
        show(id, ev.currentTarget);
      }
    },
  });

  return { active, itemHandlers };
}
