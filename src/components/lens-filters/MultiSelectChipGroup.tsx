import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterAllPillClass,
  filterGroupClass,
  filterPillActiveClass,
  filterPillClass,
  filterPillDefaultActiveClass,
} from "./styles";

interface MultiSelectChipOption {
  key: string;
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}

interface MultiSelectChipGroupProps {
  allLabel: string;
  allSelected: boolean;
  onSelectAll: () => void;
  options: MultiSelectChipOption[];
}

export default function MultiSelectChipGroup({
  allLabel,
  allSelected,
  onSelectAll,
  options,
}: MultiSelectChipGroupProps) {
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
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={cn(
            option.selected ? filterPillActiveClass : filterPillClass,
            "relative inline-flex shrink-0 whitespace-nowrap",
          )}
          onClick={option.onClick}
          aria-pressed={option.selected}
        >
          <Check
            className={cn(
              "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-all duration-200",
              option.selected
                ? "scale-100 opacity-100"
                : "scale-75 opacity-0",
            )}
          />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 transition-transform duration-200",
              option.selected && "translate-x-2",
            )}
          >
            <span>{option.label}</span>
            {option.hint ? (
              <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                {option.hint}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
