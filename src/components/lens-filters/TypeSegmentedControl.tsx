import { cn } from "@/lib/utils";

interface TypeSegmentedOption<T> {
  value: T;
  label: string;
}

interface TypeSegmentedControlProps<T> {
  ariaLabel: string;
  options: TypeSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  wrap?: boolean;
}

export default function TypeSegmentedControl<T>({
  ariaLabel,
  options,
  value,
  onChange,
  wrap = false,
}: TypeSegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("w-fit rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1", wrap ? "flex flex-wrap" : "inline-flex")}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "h-7 rounded-md px-4 text-[12px] font-medium transition-colors",
              selected
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50 dark:shadow-none"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
