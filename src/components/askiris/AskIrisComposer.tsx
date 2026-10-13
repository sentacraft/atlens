"use client";

import { type Ref } from "react";
import { ArrowUp, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";

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
  streaming = false,
  onStop,
  stopLabel,
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
  streaming?: boolean;
  onStop?: () => void;
  stopLabel?: string;
}) {
  const lg = size === "lg";
  const canSend = !disabled && value.trim().length > 0;

  return (
    <form
      className="flex w-full items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          onSubmit();
        }
      }}
    >
      {onNewTopic ? (
        <button
          type="button"
          onClick={onNewTopic}
          disabled={newTopicDisabled}
          aria-label={newTopicLabel}
          title={newTopicLabel}
          className="border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted grid size-11 shrink-0 place-items-center rounded-2xl border shadow-sm transition disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className={lg ? "size-5" : "size-4"} />
        </button>
      ) : null}
      <div
        className={cn(
          "border-input bg-background flex flex-1 items-center rounded-2xl border shadow-sm",
          "focus-within:border-ring focus-within:ring-ring/40 transition-colors focus-within:ring-2",
          lg ? "gap-3 px-3.5 py-3" : "gap-2 px-3 py-2",
        )}
      >
        <input
          ref={inputRef}
          className={cn(
            "placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none",
            // 16px minimum on mobile: iOS and Android zoom into smaller inputs on focus.
            lg ? "text-base" : "text-base sm:text-sm",
          )}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        {streaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={stopLabel}
            title={stopLabel}
            className={cn(
              "bg-primary text-primary-foreground grid shrink-0 place-items-center rounded-full transition",
              lg ? "size-9" : "size-8",
            )}
          >
            <Square className={cn("fill-current", lg ? "size-3.5" : "size-3")} />
          </button>
        ) : (
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
        )}
      </div>
    </form>
  );
}
