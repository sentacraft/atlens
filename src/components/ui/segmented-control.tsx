import { cn } from "@/lib/utils";

export type SegmentedLabel = { default: string; mobile?: string };
export type SegmentedOption<T> = { value: T; label: SegmentedLabel };

/**
 * - fill: full width on phones, as wide as its options from `sm` up.
 * - paired: shares a phone-width row with another control.
 * - wrap: options wrap onto more lines when they don't fit.
 * - equal: like fill, but every option as wide as the widest and at least 5rem, so stacked
 *   controls line up.
 */
export type SegmentedLayout = "fill" | "paired" | "wrap" | "equal";

interface SegmentedControlProps<T> {
  ariaLabel: string;
  options: SegmentedOption<T>[];
  /** Undefined leaves every option unchecked. */
  value: T | undefined;
  onChange: (value: T) => void;
  layout: SegmentedLayout;
  disabled?: boolean;
}

export default function SegmentedControl<T>({
  ariaLabel,
  options,
  value,
  onChange,
  layout,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl bg-zinc-100 p-1",
        layout === "paired" && "flex min-w-0 flex-1 sm:inline-flex sm:w-fit sm:flex-none",
        layout === "fill" && "w-full sm:w-fit flex sm:inline-flex",
        layout === "wrap" && "w-full sm:w-fit flex flex-wrap",
        layout === "equal" && "flex w-full sm:inline-grid sm:w-fit sm:grid-flow-col sm:auto-cols-[minmax(5rem,1fr)]",
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
            disabled={disabled}
            className={cn(
              "h-8 rounded-lg text-[12px] font-medium transition-colors sm:h-7 disabled:cursor-not-allowed disabled:opacity-60",
              layout === "paired" ? "flex-1 px-2.5 sm:flex-none sm:px-4" : "flex-1 px-4 sm:flex-none",
              selected
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900",
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
