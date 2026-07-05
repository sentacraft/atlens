"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";

interface ScrollChevronProps {
  direction: "left" | "right";
  /** Visibility is driven by canScrollLeft / canScrollRight from `useScrollAffordance`. */
  visible: boolean;
  onClick: () => void;
  ariaLabel: string;
  /** Extra classes — typically responsive visibility (e.g. `hidden sm:inline-flex`). */
  className?: string;
}

/**
 * Small circular chevron button used to scroll a horizontal carousel one
 * step in the given direction. Designed to float over the carousel's fade
 * affordance (see `useScrollAffordance` + the mask-image helper)
 * rather than be the fade itself, so the chip / card underneath stays
 * visually intact and only one element handles the click.
 *
 * Positioning is absolute; the caller must wrap it in a `relative` parent.
 */
export function ScrollChevron({
  direction,
  visible,
  onClick,
  ariaLabel,
  className,
}: ScrollChevronProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center rounded-full",
        // Touch-friendly on mobile (≥40px tap target, per iOS HIG), compact on desktop.
        "h-10 w-10 sm:h-7 sm:w-7",
        FROSTED_OVERLAY_CHROME_CLS,
        "text-zinc-500 hover:text-zinc-900 hover:bg-white transition-opacity",
        "dark:text-zinc-400 dark:hover:text-zinc-50",
        direction === "left" ? "left-1" : "right-1",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        className
      )}
    >
      <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
    </button>
  );
}
