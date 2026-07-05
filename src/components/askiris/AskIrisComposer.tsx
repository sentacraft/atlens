"use client";

import { type Ref } from "react";
import { ArrowUp, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";

// The AskIris input box, shared by the empty-state hero (size "lg") and the chat
// thread (size "md"). The send button lives inside the box in both — an upward
// arrow, the modern chat convention — so the two states feel like one design.
// In the thread, an optional compose button sits at the opposite (left) end as
// the "new topic" entry, balancing the send button and always in reach.
export default function AskIrisComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
  sendLabel,
  size = "md",
  autoFocus = false,
  inputRef,
  onNewTopic,
  newTopicLabel,
  newTopicDisabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder: string;
  sendLabel: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onNewTopic?: () => void;
  newTopicLabel?: string;
  newTopicDisabled?: boolean;
}) {
  const lg = size === "lg";
  const canSend = !disabled && value.trim().length > 0;

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          onSubmit();
        }
      }}
    >
      <div
        className={cn(
          "border-input bg-background flex items-center rounded-2xl border shadow-sm",
          "focus-within:border-ring focus-within:ring-ring/40 transition-colors focus-within:ring-2",
          lg ? "gap-3 px-3.5 py-3" : "gap-2 px-3 py-2",
        )}
      >
        {onNewTopic ? (
          <button
            type="button"
            onClick={onNewTopic}
            disabled={newTopicDisabled}
            aria-label={newTopicLabel}
            title={newTopicLabel}
            className={cn(
              "text-muted-foreground hover:text-foreground hover:bg-muted grid shrink-0 place-items-center rounded-full transition disabled:pointer-events-none disabled:opacity-40",
              lg ? "size-9" : "size-8",
            )}
          >
            <SquarePen className={lg ? "size-5" : "size-4"} />
          </button>
        ) : null}
        <input
          ref={inputRef}
          className={cn(
            "placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none",
            lg ? "text-base" : "text-sm",
          )}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={sendLabel}
          className={cn(
            "bg-primary text-primary-foreground grid shrink-0 place-items-center rounded-full transition disabled:opacity-40",
            lg ? "size-9" : "size-8",
          )}
        >
          <ArrowUp className={lg ? "size-5" : "size-4"} />
        </button>
      </div>
    </form>
  );
}
