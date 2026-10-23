"use client";

import { CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export interface ChartChip<K extends string> {
  key: K;
  label: string;
}

/**
 * One chip at a time: clicking selects it, clicking the selected chip again clears it. With
 * `onPreview`, hovering a chip previews it without selecting. `label` names the group; it is shown
 * only when the chips alone do not say what they do.
 */
export default function ChartChips<K extends string>({
  label,
  labelShown,
  chips,
  selected,
  onSelect,
  onPreview,
}: {
  label: string;
  labelShown: boolean;
  chips: ChartChip<K>[];
  selected?: K;
  onSelect: (key: K | undefined) => void;
  onPreview?: (key: K | undefined) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
      {labelShown && <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500 sm:pt-[7px]">{label}</span>}
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={selected === chip.key}
            onPointerEnter={(e) => e.pointerType === "mouse" && onPreview?.(chip.key)}
            onPointerLeave={(e) => e.pointerType === "mouse" && onPreview?.(undefined)}
            onClick={() => onSelect(selected === chip.key ? undefined : chip.key)}
            className={cn(CHIP_BASE_CLS, selected === chip.key ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
