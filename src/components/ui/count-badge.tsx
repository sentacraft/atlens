import { cn } from "@/lib/utils";

type Props = {
  variant: "danger" | "neutral";
  children: React.ReactNode;
};

export function CountBadge({ variant, children }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center min-w-4 h-4 px-1.5",
        "rounded-full font-mono text-[9px] font-bold leading-none",
        variant === "danger" && "bg-rose-800 text-white dark:bg-rose-700",
        variant === "neutral" &&
          "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
      )}
    >
      {children}
    </span>
  );
}
