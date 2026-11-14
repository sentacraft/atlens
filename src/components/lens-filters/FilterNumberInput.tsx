"use client";

import { useState } from "react";
import { PILL_INPUT_CLS } from "@/config/ui-tokens";
import { parsePositiveDecimal } from "@/lib/utils";

interface Props {
  label: string;
  value: number | null;
  unit: string;
  placeholder: string;
  invalidLabel: string;
  onCommit: (value: number | null) => void;
}

export default function FilterNumberInput({ label, value, unit, placeholder, invalidLabel, onCommit }: Props) {
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
    <label className={PILL_INPUT_CLS}>
      <input
        aria-label={label}
        aria-invalid={invalid || undefined}
        title={invalid ? invalidLabel : undefined}
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        className="w-16 min-w-0 bg-transparent text-base tabular-nums outline-none sm:text-sm"
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
      <span className="text-xs text-zinc-500">{unit}</span>
    </label>
  );
}
