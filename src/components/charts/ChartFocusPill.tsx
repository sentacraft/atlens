"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/** Names the lens a link opened the chart on, with a button that lets the chart go back to normal. */
export default function ChartFocusPill({ label, onClear }: { label: string; onClear: () => void }) {
  const t = useTranslations("Charts");
  return (
    <span className="inline-flex h-8 max-w-full items-center gap-2 self-start rounded-full bg-zinc-900 pl-3 pr-1 text-xs text-white">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={t("clearFocus")}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
