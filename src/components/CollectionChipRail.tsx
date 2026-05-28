"use client";

import { useRef, useState } from "react";

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
  const railRef = useRef<HTMLElement>(null);

  function scrollTo(id: string | null) {
    setActiveId(id);

    if (id === null) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

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
      className="sticky top-[var(--nav-height)] z-20 -mx-6 flex gap-1.5 overflow-x-auto border-b border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur-sm [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden dark:border-zinc-800 dark:bg-zinc-950/90"
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
