import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A suggested question someone can pick instead of typing; `page` marks one about the page beside Iris. */
export default function ExampleQuestion({
  tone,
  onClick,
  disabled,
  children,
}: {
  tone: "page" | "general";
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-50",
        tone === "page" ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100" : "border-border bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
