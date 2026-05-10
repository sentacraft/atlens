"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Z } from "@/config/ui";

interface CustomizePopoverProps {
  title: string;
  slogan: string;
  onTitleChange: (value: string) => void;
  onSloganChange: (value: string) => void;
  titlePlaceholder: string;
}

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-600";

export function CustomizePopover({
  title,
  slogan,
  onTitleChange,
  onSloganChange,
  titlePlaceholder,
}: CustomizePopoverProps) {
  const t = useTranslations("Share");
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        title={t("customize")}
        className={cn(
          "flex items-center justify-center rounded-lg border px-3 py-2.5 outline-none transition-colors",
          open
            ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
            : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        )}
      >
        <SlidersHorizontal className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} className={Z.overlay}>
          <Popover.Popup className="w-72 origin-(--transform-origin) rounded-xl border border-zinc-200 bg-white p-3 shadow-lg duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 dark:text-zinc-500">
                  {t("customizeTitle")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder={titlePlaceholder}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 dark:text-zinc-500">
                  {t("customizeSlogan")}
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => onSloganChange(e.target.value)}
                  placeholder={t("customizeSloganPlaceholder")}
                  className={inputClass}
                />
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
