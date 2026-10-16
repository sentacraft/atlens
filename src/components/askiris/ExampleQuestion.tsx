import type { ReactNode } from "react";

/** A suggested question someone can pick instead of typing. */
export default function ExampleQuestion({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border-border hover:bg-muted flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-sm transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
