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
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) {
          return;
        }
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            return;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    for (const el of els) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

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

      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => scrollTo(s.id)}
          className={`${chipBase} ${activeId === s.id ? chipActive : chipIdle}`}
        >
          {s.label}
          <span
            className={`font-mono text-[10px] ${activeId === s.id ? "text-white/65 dark:text-zinc-900/65" : "text-zinc-400 dark:text-zinc-500"}`}
          >
            {s.count}
          </span>
        </button>
      ))}
    </nav>
  );
}
