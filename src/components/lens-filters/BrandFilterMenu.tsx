"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function CheckboxIndicator({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
          : "border-zinc-300 dark:border-zinc-600",
      )}
    >
      {checked ? <Check className="size-3 text-white dark:text-zinc-900" /> : null}
    </span>
  );
}

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
          "inline-flex h-8.5 w-full max-w-full items-center justify-between gap-1.5 rounded-full border px-3.5 text-[12px] shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 sm:w-auto sm:min-w-28",
          hasSelection
            ? "border-transparent bg-zinc-900 font-medium text-white hover:border-zinc-800 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            : "border-zinc-200 bg-zinc-50 font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100",
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform duration-200 data-[popup-open]:rotate-180" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup className="min-w-[18rem] max-w-[min(22rem,calc(100vw-1rem))] origin-(--transform-origin) overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5 text-sm shadow-xl shadow-zinc-950/20 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900">
            <Menu.CheckboxItem
              checked={!hasSelection}
              onCheckedChange={() => {
                if (hasSelection) {
                  onClear();
                }
              }}
              closeOnClick={false}
              className="relative flex cursor-pointer items-center gap-2 px-3 py-2 outline-none pointer-fine:data-highlighted:bg-zinc-100 dark:pointer-fine:data-highlighted:bg-zinc-800"
            >
              <CheckboxIndicator checked={!hasSelection} />
              <span className="text-zinc-800 dark:text-zinc-200">{allLabel}</span>
            </Menu.CheckboxItem>
            <div className="-mx-1.5 my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
            <div className="grid grid-cols-2">
              {brands.map((brand) => {
                const isChecked = selected.includes(brand);
                return (
                  <Menu.CheckboxItem
                    key={brand}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(brand)}
                    closeOnClick={false}
                    className="relative flex cursor-pointer items-center gap-2 px-3 py-2 outline-none pointer-fine:data-highlighted:bg-zinc-100 dark:pointer-fine:data-highlighted:bg-zinc-800"
                  >
                    <CheckboxIndicator checked={isChecked} />
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

