"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useNav } from "@/context/NavProvider";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";
import { CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  label: string;
  /** Shown beside the label; only the collections index has counts. */
  count?: number;
}

// Past the row's own edge: the fill and the one line reach the screen's sides while the chips stay
// aligned to the page content. clip-path keeps the shadows from adding scrollable overflow.
const STUCK_CLS =
  "bg-zinc-50/95 shadow-[0_0_0_100vmax_rgb(250_250_250/0.95),0_1px_0_100vmax_rgb(228_228_231)] [clip-path:inset(0_-100vmax_-1px_-100vmax)] backdrop-blur-sm";

/** The nav's height in px: a custom property holding a calc() cannot be read back as a number. */
function navHeightPx(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:var(--nav-height)";
  document.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

/** True while the row is pinned under the nav, which is the only time it carries a line. */
function useStuck(ref: RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    function update() {
      if (!el) {
        return;
      }
      // Pinned means at or above the nav's bottom edge: it sits there, or slides up to the top when
      // the nav hides, and a scroll event during that slide would read a half-way top.
      setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= navHeightPx() + 0.5);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return stuck;
}

/**
 * A row of section chips that sticks under the nav. With `allItem` the first chip is the page
 * top, selected while no section has been reached.
 */
export default function SectionChipRow({
  items,
  activeId,
  onSelect,
  allItem,
  ariaLabel,
  className,
}: {
  items: readonly SectionNavItem[];
  /** The section being read; null is the page top. */
  activeId: string | null;
  onSelect: (id: string | null) => void;
  allItem?: { label: string; count?: number };
  ariaLabel: string;
  className?: string;
}) {
  const { navHidden } = useNav();
  const navRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const stuck = useStuck(navRef);

  useEffect(() => {
    const rail = railRef.current;
    // jsdom has no element scrolling.
    if (!rail || typeof rail.scrollBy !== "function") {
      return;
    }
    if (activeId === null) {
      rail.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (activeId === items[items.length - 1]?.id) {
      rail.scrollTo({ left: rail.scrollWidth, behavior: "smooth" });
      return;
    }
    const active = rail.querySelector("[data-active=true]") as HTMLElement | null;
    if (active) {
      // Not scrollIntoView: it also scrolls the page, which cancels in-flight touch momentum.
      const railRect = rail.getBoundingClientRect();
      const chipRect = active.getBoundingClientRect();
      const pad = 24;
      if (chipRect.left < railRect.left + pad) {
        rail.scrollBy({ left: chipRect.left - railRect.left - pad, behavior: "smooth" });
      } else if (chipRect.right > railRect.right - pad) {
        rail.scrollBy({ left: chipRect.right - railRect.right + pad, behavior: "smooth" });
      }
    }
  }, [activeId, items]);

  function chip(id: string | null, label: string, count: number | undefined) {
    const active = activeId === id;
    return (
      <a
        key={id ?? "top"}
        href={id ? `#${id}` : "#"}
        data-active={active}
        aria-current={active ? "true" : undefined}
        onClick={(event) => {
          event.preventDefault();
          onSelect(id);
        }}
        className={cn(CHIP_BASE_CLS, "no-underline", active ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS)}
      >
        {label}
        {count !== undefined && (
          <span className={cn("font-mono text-[10px]", active ? "text-white/65" : "text-zinc-400")}>{count}</span>
        )}
      </a>
    );
  }

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={cn("sticky z-20 transition-[top] duration-300 ease-in-out", stuck && STUCK_CLS, className)}
      style={{ top: navHidden ? 0 : "var(--nav-height)" }}
    >
      <HorizontalScrollRail scrollRef={railRef} className="gap-1.5 py-2.5" fadeBg="from-white">
        {allItem && chip(null, allItem.label, allItem.count)}
        {items.map((item) => chip(item.id, item.label, item.count))}
      </HorizontalScrollRail>
    </nav>
  );
}
