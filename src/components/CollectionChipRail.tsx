"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNav } from "@/context/NavContext";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const { navHidden } = useNav();
  const railRef = useRef<HTMLDivElement>(null);
  const isClickScrolling = useRef(false);

  // Scroll-spy: highlight the chip whose section is currently in view.
  useEffect(() => {
    const ids = sections.map((s) => s.id);

    function pickActive() {
      if (isClickScrolling.current) {
        return;
      }

      const topEl = document.getElementById(TOP_SENTINEL);
      if (topEl) {
        const topRect = topEl.getBoundingClientRect();
        if (topRect.bottom > 0) {
          setActiveId(null);
          return;
        }
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom && ids.length > 0) {
        setActiveId(ids[ids.length - 1]);
        return;
      }

      const threshold = window.innerHeight * 0.35;
      let best: string | null = null;

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) {
          continue;
        }
        if (el.getBoundingClientRect().top <= threshold) {
          best = id;
        }
      }

      if (best) {
        setActiveId(best);
      }
    }

    pickActive();
    window.addEventListener("scroll", pickActive, { passive: true });
    return () => window.removeEventListener("scroll", pickActive);
  }, [sections]);

  // Keep the active chip visible inside the horizontal rail.
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
      // Scroll the rail horizontally by hand instead of Element.scrollIntoView:
      // scrollIntoView walks up to the document scrolling element to satisfy
      // its block axis, and that programmatic scroll cancels the page's
      // in-flight touch momentum — so a fast flick would dead-stop the moment
      // scroll-spy lit a chip near the rail edge. scrollBy on the rail only
      // ever touches the rail's own horizontal axis.
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

  const scrollTo = useCallback(
    (id: string | null) => {
      setActiveId(id);
      isClickScrolling.current = true;

      if (id === null) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }

      setTimeout(() => {
        isClickScrolling.current = false;
      }, 800);
    },
    [],
  );

  const chipBase =
    "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 select-none";
  const chipIdle =
    "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100";
  const chipActive =
    "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900";

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
        className={`${chipBase} ${activeId === null ? chipActive : chipIdle}`}
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
            className={`${chipBase} ${isActive ? chipActive : chipIdle}`}
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
