"use client";

import { Popover } from "@base-ui/react/popover";
import { Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  note: string;
  variant?: "info" | "warning";
}

export function FieldNotePopover({ note, variant = "info" }: Props) {
  const t = useTranslations("Common");

  return (
    <Popover.Root>
      <Popover.Trigger
        className={
          variant === "warning"
            ? "inline-flex shrink-0 items-center justify-center rounded-full text-amber-500 outline-none transition-colors hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-400 dark:text-amber-400 dark:hover:text-amber-300"
            : "inline-flex shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-500 dark:hover:text-zinc-300"
        }
        aria-label={t("additionalInfo")}
      >
        {variant === "warning" ? <TriangleAlert className="size-3.5" /> : <Info className="size-3.5" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6}>
          <Popover.Popup className="max-w-64 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {note}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
