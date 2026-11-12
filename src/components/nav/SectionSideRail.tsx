"use client";

import { SIDE_NAV_ITEM_ACTIVE_CLS, SIDE_NAV_ITEM_CLS, SIDE_NAV_ITEM_IDLE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import type { SectionNavItem } from "@/components/nav/SectionChipRow";

/** A list of the page's sections for the margin beside it, the section being read shaded. */
export default function SectionSideRail({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: {
  items: readonly SectionNavItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(event) => {
            event.preventDefault();
            onSelect(item.id);
          }}
          aria-current={activeId === item.id ? "true" : undefined}
          className={cn(SIDE_NAV_ITEM_CLS, activeId === item.id ? SIDE_NAV_ITEM_ACTIVE_CLS : SIDE_NAV_ITEM_IDLE_CLS)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
