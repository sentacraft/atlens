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
  compact?: boolean;
  mobileLabelOverrides?: Record<string, string>;
}

export default function TypeSegmentedControl<T>({
  ariaLabel,
  options,
  value,
  onChange,
  wrap = false,
  compact = false,
  mobileLabelOverrides,
}: TypeSegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 sm:p-1",
        compact
          ? "flex min-w-0 flex-1"
          : cn("w-full sm:w-fit", wrap ? "flex flex-wrap" : "flex sm:inline-flex"),
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const mobileLabel = mobileLabelOverrides?.[String(option.value)];
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "h-9 rounded-md text-[12px] font-medium transition-colors flex-1 sm:h-7",
              compact ? "px-2.5" : "px-4 sm:flex-none",
              selected
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50 dark:shadow-none"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
            onClick={() => onChange(option.value)}
          >
            {mobileLabel ? (
              <>
                <span className="sm:hidden">{mobileLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
