"use client";

import { useRef, useState } from "react";

/**
 * How a chart shows one lens. Mouse users get its card on hover and follow its link on click; touch
 * has no hover, so a tap opens the lens sheet instead. `onShow` receives the lens element whenever
 * its card appears, for charts that place the card beside it.
 */
export function useChartCard(onShow?: (el: HTMLElement) => void) {
  const [active, setActive] = useState<string>();
  // The lens is kept after closing so the sheet does not empty out during its exit animation.
  const [sheet, setSheet] = useState<{ id?: string; open: boolean }>({ open: false });
  const lastPointer = useRef("mouse");

  const itemHandlers = (id: string) => ({
    onPointerDown: (ev: React.PointerEvent) => {
      lastPointer.current = ev.pointerType;
    },
    onPointerEnter: (ev: React.PointerEvent<HTMLElement>) => {
      if (ev.pointerType === "mouse") {
        setActive(id);
        onShow?.(ev.currentTarget);
      }
    },
    onPointerLeave: (ev: React.PointerEvent) => {
      if (ev.pointerType === "mouse") {
        setActive(undefined);
      }
    },
    onClick: (ev: React.MouseEvent<HTMLElement>) => {
      // A keyboard Enter also fires click, with detail 0; it should follow the link like a mouse.
      if (lastPointer.current !== "mouse" && ev.detail !== 0) {
        ev.preventDefault();
        setSheet({ id, open: true });
      }
    },
  });

  return {
    active,
    itemHandlers,
    sheet: { id: sheet.id, open: sheet.open, onOpenChange: (open: boolean) => setSheet((prev) => ({ ...prev, open })) },
  };
}

export type ChartItemHandlers = ReturnType<ReturnType<typeof useChartCard>["itemHandlers"]>;
