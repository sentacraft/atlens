"use client";

import { useTranslations } from "next-intl";
import { ArrowDownWideNarrow, ArrowUp, ArrowDown } from "lucide-react";
import type { SortKey } from "@/lib/lens";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  sort: SortKey;
  sortDir: "asc" | "desc";
  onSortChange: (sort: SortKey) => void;
  onToggleDir: () => void;
}

/**
 * Sort key picker + direction toggle, shared by the browse list and the
 * collection detail grid so both surfaces sort identically. Owns only the
 * control UI and label copy; the caller holds the sort state.
 */
export default function LensSortControl({
  sort,
  sortDir,
  onSortChange,
  onToggleDir,
}: Props) {
  const t = useTranslations("LensList");

  const sortOptions = [
    { value: "focalLength", label: t("sortFocalLength") },
    { value: "maxAperture", label: t("sortAperture") },
    { value: "weightG", label: t("sortWeight") },
  ] as const satisfies readonly { value: SortKey; label: string }[];

  return (
    <div className="inline-flex h-9 items-stretch overflow-hidden rounded-xl border border-zinc-200/70 bg-white/80 shadow-sm shadow-zinc-950/[0.02] dark:border-zinc-800 dark:bg-zinc-900/30">
      <Select
        value={sort}
        onValueChange={(value) => onSortChange((value ?? "focalLength") as SortKey)}
        items={sortOptions.map((option) => ({ ...option }))}
      >
        <SelectTrigger
          id="results-sort"
          className="h-full data-[size=default]:h-full gap-2 rounded-none border-0 bg-transparent py-0 px-3 text-[12px] shadow-none hover:bg-zinc-50/50 data-[popup-open]:bg-zinc-100 dark:hover:bg-zinc-800/30 dark:data-[popup-open]:bg-zinc-800/50 sm:text-[13px]"
        >
          <ArrowDownWideNarrow className="size-3.5 shrink-0 text-zinc-900 dark:text-zinc-100" />
          <SelectValue placeholder={t("sortFocalLength")} />
        </SelectTrigger>
        <SelectContent
          align="end"
          alignOffset={-40}
          sideOffset={5}
          className="w-[calc(var(--anchor-width)+40px)] min-w-0 overflow-hidden rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
        >
          {sortOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              // Full-bleed highlight: square corners let the popup's own
              // rounded-lg + overflow clip the top/bottom rows, instead of a
              // rounded bar floating inside the menu with gaps at the edges.
              className="rounded-none py-2 sm:py-2 text-[12px] text-zinc-500 dark:text-zinc-400 data-[selected]:text-zinc-900 dark:data-[selected]:text-zinc-50"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="w-px self-stretch bg-zinc-200 dark:bg-zinc-800" />
      <button
        type="button"
        className="inline-flex items-center px-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
        onClick={onToggleDir}
        aria-label={sortDir === "asc" ? t("sortAsc") : t("sortDesc")}
      >
        {sortDir === "asc" ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )}
      </button>
    </div>
  );
}
