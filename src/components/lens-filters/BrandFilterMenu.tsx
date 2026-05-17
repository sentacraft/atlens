"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandFilterMenuProps {
  brands: string[];
  selected: string[];
  brandLabels: Record<string, string>;
  allLabel: string;
  triggerLabel: string;
  onToggle: (brand: string) => void;
  onClear: () => void;
}

export default function BrandFilterMenu({
  brands,
  selected,
  brandLabels,
  allLabel,
  triggerLabel,
  onToggle,
  onClear,
}: BrandFilterMenuProps) {
  const hasSelection = selected.length > 0;

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "inline-flex h-8.5 min-w-28 max-w-full items-center justify-between gap-1.5 rounded-full border px-3.5 text-[12px] shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
          hasSelection
            ? "border-transparent bg-zinc-900 font-medium text-white hover:border-zinc-800 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            : "border-transparent bg-zinc-50 font-medium text-zinc-700 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100",
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform duration-200 data-[popup-open]:rotate-180" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup className="min-w-44 max-w-[min(16rem,calc(100vw-1rem))] origin-(--transform-origin) overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900">
            <Menu.CheckboxItem
              checked={!hasSelection}
              onCheckedChange={() => {
                if (hasSelection) {
                  onClear();
                }
              }}
              closeOnClick={false}
              className="relative flex cursor-pointer items-center gap-2 px-3 py-2 outline-none data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800"
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {!hasSelection ? <Check className="size-3.5 text-zinc-900 dark:text-zinc-100" /> : null}
              </span>
              <span className="text-zinc-800 dark:text-zinc-200">{allLabel}</span>
            </Menu.CheckboxItem>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
            <div className="max-h-72 overflow-y-auto">
              {brands.map((brand) => {
                const isChecked = selected.includes(brand);
                return (
                  <Menu.CheckboxItem
                    key={brand}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(brand)}
                    closeOnClick={false}
                    className="relative flex cursor-pointer items-center gap-2 px-3 py-2 outline-none data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {isChecked ? <Check className="size-3.5 text-zinc-900 dark:text-zinc-100" /> : null}
                    </span>
                    <span className="truncate text-zinc-800 dark:text-zinc-200">{brandLabels[brand] ?? brand}</span>
                  </Menu.CheckboxItem>
                );
              })}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

