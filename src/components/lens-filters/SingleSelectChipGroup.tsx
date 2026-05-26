import { cn } from "@/lib/utils";
import {
  filterPillClass,
  filterPillActiveClass,
  filterPillDefaultActiveClass,
} from "./styles";

interface SingleSelectOption<T> {
  value: T;
  label: string;
}

interface SingleSelectChipGroupProps<T> {
  allLabel: string;
  options: SingleSelectOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}

export default function SingleSelectChipGroup<T>({
  allLabel,
  options,
  value,
  onChange,
}: SingleSelectChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          value === null ? filterPillDefaultActiveClass : filterPillClass,
          "shrink-0 whitespace-nowrap",
        )}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            value === option.value ? filterPillActiveClass : filterPillClass,
            "shrink-0 whitespace-nowrap",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
