"use client";

import { useState, type Ref } from "react";
import { cn, parsePositiveDecimal } from "@/lib/utils";

interface Props {
  label: string;
  value: number | null;
  placeholder: string;
  invalidLabel: string;
  width: "fixed" | "content";
  inputRef: Ref<HTMLInputElement> | undefined;
  onCommit: (value: number | null) => void;
}

export default function FilterNumberInput({ label, value, placeholder, invalidLabel, width, inputRef, onCommit }: Props) {
  const [draft, setDraft] = useState(value === null ? "" : String(Number(value.toPrecision(12))));
  const [invalid, setInvalid] = useState(false);
  const [dirty, setDirty] = useState(false);

  function commit() {
    if (!dirty) {return;}
    const trimmed = draft.trim();
    const next = parsePositiveDecimal(trimmed);
    if (trimmed && next === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDirty(false);
    if (next !== value) {onCommit(next);}
  }

  return (
    <input
      ref={inputRef}
      aria-label={label}
      aria-invalid={invalid || undefined}
      title={invalid ? invalidLabel : undefined}
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      className={cn("min-w-0 bg-transparent text-base text-inherit tabular-nums outline-none sm:text-sm", width === "fixed" && "w-16")}
      style={width === "content" ? { width: `${Math.max(2, Math.min(12, draft.length || placeholder.length))}ch` } : undefined}
      onChange={(event) => { setDraft(event.target.value); setInvalid(false); setDirty(true); }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {event.currentTarget.blur();}
        if (event.key === "Escape") {
          setDraft(value === null ? "" : String(Number(value.toPrecision(12))));
          setInvalid(false);
          setDirty(false);
        }
      }}
    />
  );
}
