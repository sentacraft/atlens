import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterAllPillClass,
  filterGroupClass,
  filterPillActiveClass,
  filterPillClass,
  filterPillDefaultActiveClass,
} from "./styles";

export type MultiSelectChipOption<K extends string> = {
  key: K;
  label: string;
  hint?: string;
}

interface MultiSelectChipGroupProps<K extends string> {
  allLabel: string;
  onSelectAll: () => void;
  options: MultiSelectChipOption<K>[];
  selectedKeys: readonly K[];
  onToggle: (key: K) => void;
}

// Controlled group: selection state and the toggle handler live here, not on each
// option. Generic over the key type so callers keep their key union (brand string
// vs FocalCategory) without a cast.
export default function MultiSelectChipGroup<K extends string>({
  allLabel,
  onSelectAll,
  options,
  selectedKeys,
  onToggle,
}: MultiSelectChipGroupProps<K>) {
  const allSelected = selectedKeys.length === 0;

  return (
    <div className={filterGroupClass}>
      <button
        type="button"
        className={cn(
          allSelected ? filterPillDefaultActiveClass : filterPillClass,
          filterAllPillClass,
          "shrink-0 whitespace-nowrap",
        )}
        onClick={onSelectAll}
        aria-pressed={allSelected}
      >
        {allLabel}
      </button>
      {options.map((option) => {
        const selected = selectedKeys.includes(option.key);
        return (
          <button
            key={option.key}
            type="button"
            className={cn(
              selected ? filterPillActiveClass : filterPillClass,
              "relative inline-flex shrink-0 whitespace-nowrap",
            )}
            onClick={() => onToggle(option.key)}
            aria-pressed={selected}
          >
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
              <span>{option.label}</span>
              {option.hint ? (
                <span
                  className={cn(
                    "text-[10px] font-normal",
                    selected
                      ? "text-zinc-300 dark:text-zinc-500"
                      : "text-zinc-400 dark:text-zinc-500",
                  )}
                >
                  {option.hint}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
