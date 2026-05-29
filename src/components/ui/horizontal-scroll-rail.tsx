"use client";

import { useEffect, useRef, type DependencyList, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { useHorizontalScrollAffordance } from "@/hooks/useHorizontalScrollAffordance";

interface HorizontalScrollRailProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  fadeBg: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  deps?: DependencyList;
  renderOverlay?: (state: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
  }) => React.ReactNode;
}

export function HorizontalScrollRail({
  children,
  className,
  wrapperClassName,
  wrapperStyle,
  fadeBg,
  scrollRef,
  deps,
  renderOverlay,
}: HorizontalScrollRailProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? internalRef;
  const { canScrollLeft, canScrollRight } = useHorizontalScrollAffordance(ref, deps);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    function onWheel(e: WheelEvent) {
      if (!el || el.scrollWidth <= el.clientWidth) {
        return;
      }
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
        return;
      }
      e.preventDefault();
      el.scrollBy({ left: e.deltaY });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);

  return (
    <div className={cn("relative", wrapperClassName)} style={wrapperStyle}>
      <div
        ref={ref}
        className={cn(
          "flex overflow-x-auto overflow-y-clip [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
        <div className="shrink-0 w-6" aria-hidden="true" />
      </div>
      {canScrollLeft && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r",
            fadeBg,
          )}
        />
      )}
      {canScrollRight && (
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l",
            fadeBg,
          )}
        />
      )}
      {renderOverlay?.({ canScrollLeft, canScrollRight })}
    </div>
  );
}
