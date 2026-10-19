"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { cn } from "@/lib/utils";
import { POPUP_SCROLL_CLS, POPUP_SURFACE_CLS } from "@/config/ui-tokens";

/** A free-text input that suggests matching values as the user types. */
export default function Autocomplete({
  value,
  onValueChange,
  suggestions,
  className,
  ...inputProps
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: readonly string[];
}) {
  return (
    <AutocompletePrimitive.Root items={suggestions} value={value} onValueChange={onValueChange}>
      <AutocompletePrimitive.Input className={className} {...inputProps} />
      <AutocompletePrimitive.Portal>
        <AutocompletePrimitive.Positioner sideOffset={6} className="isolate">
          <AutocompletePrimitive.Popup
            className={cn(
              "max-h-[min(var(--available-height),16rem)] w-(--anchor-width) origin-(--transform-origin) p-1 duration-100 data-[empty]:hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0",
              POPUP_SURFACE_CLS,
              POPUP_SCROLL_CLS,
            )}
          >
            <AutocompletePrimitive.List>
              {(item: string) => (
                <AutocompletePrimitive.Item
                  key={item}
                  value={item}
                  className="flex cursor-default items-center rounded-md px-3 py-2.5 text-sm text-zinc-700 outline-hidden select-none data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900 sm:py-1.5"
                >
                  {item}
                </AutocompletePrimitive.Item>
              )}
            </AutocompletePrimitive.List>
          </AutocompletePrimitive.Popup>
        </AutocompletePrimitive.Positioner>
      </AutocompletePrimitive.Portal>
    </AutocompletePrimitive.Root>
  );
}
