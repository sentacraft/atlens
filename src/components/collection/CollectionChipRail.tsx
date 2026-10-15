"use client";

import { useEffect, useMemo, useRef } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { useNav } from "@/context/NavProvider";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";
import { CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";

interface Section {
  id: string;
  label: string;
  count: number;
}

interface CollectionChipRailProps {
  sections: Section[];
  totalCount: number;
  allLabel: string;
}

const TOP_SENTINEL = "collections-top";

export default function CollectionChipRail({
  sections,
  totalCount,
  allLabel,
}: CollectionChipRailProps) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const { activeId, scrollTo } = useScrollSpy(ids, { topSentinelId: TOP_SENTINEL });
  const { navHidden } = useNav();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    if (activeId === null) {
      rail.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (activeId === sections[sections.length - 1]?.id) {
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
  }, [activeId, sections]);

  return (
    <HorizontalScrollRail
      scrollRef={railRef}
      className="gap-1.5 px-5 py-3 sm:px-6"
      wrapperClassName="sticky z-20 -mx-5 sm:-mx-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm transition-[top] duration-300 ease-in-out"
      wrapperStyle={{ top: navHidden ? 0 : "var(--nav-height)" }}
      fadeBg="from-white dark:from-zinc-950"
    >
      <button
        type="button"
        data-active={activeId === null}
        onClick={() => scrollTo(null)}
        className={`${CHIP_BASE_CLS} ${activeId === null ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS}`}
      >
        {allLabel}
        <span
          className={`font-mono text-[10px] ${activeId === null ? "text-white/65 dark:text-zinc-900/65" : "text-zinc-400 dark:text-zinc-500"}`}
        >
          {totalCount}
        </span>
      </button>

      {sections.map((s) => {
        const isActive = activeId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            data-active={isActive}
            onClick={() => scrollTo(s.id)}
            className={`${CHIP_BASE_CLS} ${isActive ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS}`}
          >
            {s.label}
            <span
              className={`font-mono text-[10px] ${isActive ? "text-white/65 dark:text-zinc-900/65" : "text-zinc-400 dark:text-zinc-500"}`}
            >
              {s.count}
            </span>
          </button>
        );
      })}
    </HorizontalScrollRail>
  );
}
