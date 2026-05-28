"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [navHidden, setNavHidden] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const nav = document.querySelector("header[data-hidden]");
    if (!nav) {
      return;
    }
    const sync = () => setNavHidden(nav.getAttribute("data-hidden") === "true");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(nav, { attributes: true, attributeFilter: ["data-hidden"] });
    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    const active = rail.querySelector("[data-active=true]") as HTMLElement | null;
    if (!active) {
      return;
    }
    const railRect = rail.getBoundingClientRect();
    const chipRect = active.getBoundingClientRect();
    const offset =
      chipRect.left - railRect.left - (railRect.width - chipRect.width) / 2;
    rail.scrollBy({ left: offset, behavior: "smooth" });
  }, [activeId]);

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
    <nav
      ref={railRef}
      aria-label="Jump to section"
      style={{ top: navHidden ? 0 : "var(--nav-height)" }}
      className="sticky z-20 -mx-6 flex gap-1.5 overflow-x-auto border-b border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur-sm transition-[top] duration-300 ease-in-out [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden dark:border-zinc-800 dark:bg-zinc-950/90"
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
    </nav>
  );
}
