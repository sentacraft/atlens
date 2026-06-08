import { cn } from "@/lib/utils";

export type SegmentedLabel = { default: string; mobile?: string };
export type SegmentedOption<T> = { value: T; label: SegmentedLabel };

// Layout variant — all three converge to the same content-width inline control
// at sm+; they differ only in how the control sits at mobile width:
//   full   — owns its row, full width (the neutral default)
//   paired — shares a row with a sibling, takes an equal flex share, tighter
//   wrap   — owns its row, full width, pills wrap onto multiple lines
type SegmentedVariant = "full" | "paired" | "wrap";

interface TypeSegmentedControlProps<T> {
  ariaLabel: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: SegmentedVariant;
}

export default function TypeSegmentedControl<T>({
  ariaLabel,
  options,
  value,
  onChange,
  variant = "full",
}: TypeSegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1",
        variant === "paired" && "flex min-w-0 flex-1 sm:inline-flex sm:w-fit sm:flex-none",
        variant === "full" && "w-full sm:w-fit flex sm:inline-flex",
        variant === "wrap" && "w-full sm:w-fit flex flex-wrap",
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label.default}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              "h-8 rounded-lg text-[12px] font-medium transition-colors sm:h-7",
              variant === "paired" ? "flex-1 px-2.5 sm:flex-none sm:px-4" : "flex-1 px-4 sm:flex-none",
              selected
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50 dark:shadow-none"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label.mobile ? (
              <>
                <span className="sm:hidden">{option.label.mobile}</span>
                <span className="hidden sm:inline">{option.label.default}</span>
              </>
            ) : (
              option.label.default
            )}
          </button>
        );
      })}
    </div>
  );
}
