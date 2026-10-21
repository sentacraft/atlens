"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wraps a list whose later rows carry `group-data-expanded/alternatives:` classes. They stay in the
 * HTML while hidden, so every row is a crawlable link.
 */
export default function AlternativesExpander({
  showMoreLabel,
  showLessLabel,
  children,
}: {
  showMoreLabel: string;
  showLessLabel: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div data-expanded={expanded || undefined} className="group/alternatives">
      {children}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 border-t border-zinc-100 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:min-h-11 sm:text-[13px]"
      >
        {expanded ? showLessLabel : showMoreLabel}
        <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
      </button>
    </div>
  );
}
