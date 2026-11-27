"use client";

import { useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { cn } from "@/lib/utils";

function fadeMask(top: boolean, bottom: boolean) {
  if (!top && !bottom) {
    return undefined;
  }
  return `linear-gradient(to bottom, ${top ? "transparent" : "black"}, black 1.25em, black calc(100% - 1.25em), ${bottom ? "transparent" : "black"})`;
}

export default function AskIrisComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
  sendLabel,
  size = "md",
  autoFocus = false,
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
  streaming?: boolean;
  onStop?: () => void;
  stopLabel?: string;
}) {
  const lg = size === "lg";
  const canSend = !disabled && value.trim().length > 0;
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const { canScrollUp, canScrollDown } = useScrollAffordance(fieldRef, [value]);

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
      <div
        className={cn(
          "bg-background flex flex-1 items-end border border-zinc-300 shadow-[0_2px_10px_rgba(24,24,27,0.06)] transition-colors focus-within:border-zinc-500",
          lg ? "gap-3 rounded-[28px] py-2 pr-2 pl-5" : "gap-2.5 rounded-[26px] py-[7px] pr-[7px] pl-[18px]",
        )}
      >
        <textarea
          ref={fieldRef}
          rows={1}
          enterKeyHint="send"
          className={cn(
            "placeholder:text-muted-foreground max-h-[3lh] min-w-0 flex-1 resize-none self-center bg-transparent outline-none [field-sizing:content] [scrollbar-width:none] sm:max-h-[2lh] [&::-webkit-scrollbar]:hidden",
            // 16px minimum on mobile: iOS and Android zoom into smaller inputs on focus.
            lg ? "text-base" : "text-base sm:text-sm",
          )}
          style={{ maskImage: fadeMask(canScrollUp, canScrollDown) }}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Shift+Enter breaks the line; Enter that confirms an IME composition is not a send.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {streaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={stopLabel}
            title={stopLabel}
            className={cn(
              "bg-primary text-primary-foreground grid shrink-0 place-items-center rounded-full transition",
              lg ? "size-9" : "size-[34px]",
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
              lg ? "size-9" : "size-[34px]",
            )}
          >
            <ArrowUp className={lg ? "size-5" : "size-4"} />
          </button>
        )}
      </div>
    </form>
  );
}
