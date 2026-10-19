import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PILL_ACTIVE_CLS, PILL_ALL_ACTIVE_CLS, PILL_CLS } from "@/config/ui-tokens";

export interface ToggleChipOption<K extends string> {
  key: K;
  label: string;
  /** Small secondary text after the label. */
  hint?: string;
  /** Swapped for a check mark when selected; without one, the check slides in. */
  icon?: LucideIcon;
  disabled?: boolean;
}

/** Pills that each toggle on and off; `allOption` adds a leading pill that clears them. */
export default function ToggleChipGroup<K extends string>({
  options,
  selectedKeys,
  onToggle,
  allOption,
}: {
  options: ToggleChipOption<K>[];
  selectedKeys: readonly K[];
  onToggle: (key: K) => void;
  allOption?: { label: string; onSelect: () => void };
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {allOption && (
        <button
          type="button"
          className={cn(selectedKeys.length === 0 ? PILL_ALL_ACTIVE_CLS : PILL_CLS, "shrink-0 justify-center whitespace-nowrap")}
          onClick={allOption.onSelect}
          aria-pressed={selectedKeys.length === 0}
        >
          {allOption.label}
        </button>
      )}
      {options.map((option) => {
        const selected = selectedKeys.includes(option.key);
        const Icon = option.icon;
        return (
          <button
            key={option.key}
            type="button"
            className={cn(
              selected ? PILL_ACTIVE_CLS : PILL_CLS,
              "relative shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40",
            )}
            onClick={() => onToggle(option.key)}
            aria-pressed={selected}
            disabled={option.disabled}
          >
            {Icon ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="relative inline-flex h-3.5 w-3.5 shrink-0">
                  <Icon
                    className={cn(
                      "absolute inset-0 h-3.5 w-3.5 transition-all duration-200",
                      selected ? "scale-75 opacity-0" : "scale-100 opacity-100",
                    )}
                  />
                  <Check
                    className={cn(
                      "absolute inset-0 h-3.5 w-3.5 transition-all duration-200",
                      selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
                    )}
                  />
                </span>
                <Label option={option} selected={selected} />
              </span>
            ) : (
              <>
                <Check
                  className={cn(
                    "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-all duration-200",
                    selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 transition-transform duration-200",
                    selected && "translate-x-2",
                  )}
                >
                  <Label option={option} selected={selected} />
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Label<K extends string>({ option, selected }: { option: ToggleChipOption<K>; selected: boolean }) {
  return (
    <>
      <span>{option.label}</span>
      {option.hint && (
        <span
          className={cn(
            "text-[10px] font-normal",
            selected ? "text-zinc-300" : "text-zinc-400",
          )}
        >
          {option.hint}
        </span>
      )}
    </>
  );
}
