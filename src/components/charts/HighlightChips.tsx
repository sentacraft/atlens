"use client";

import { CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export interface HighlightChip<K extends string> {
  key: K;
  label: string;
}

/** Hovering previews a highlight; clicking pins it, clicking the pinned chip again clears it. */
export default function HighlightChips<K extends string>({
  label,
  chips,
  pinned,
  onPreview,
  onPin,
}: {
  label: string;
  chips: HighlightChip<K>[];
  pinned?: K;
  onPreview: (key: K | undefined) => void;
  onPin: (key: K | undefined) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-zinc-500">{label}</span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={pinned === chip.key}
            onPointerEnter={(e) => e.pointerType === "mouse" && onPreview(chip.key)}
            onPointerLeave={(e) => e.pointerType === "mouse" && onPreview(undefined)}
            onClick={() => onPin(pinned === chip.key ? undefined : chip.key)}
            className={cn(CHIP_BASE_CLS, pinned === chip.key ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
