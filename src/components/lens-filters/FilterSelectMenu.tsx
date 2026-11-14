"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { MenuPopup } from "@/components/ui/menu";
import { MENU_ITEM_CLS, PILL_ACTIVE_CLS, PILL_MENU_IDLE_CLS, PILL_MENU_TRIGGER_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: readonly Option<T>[];
  active: boolean;
  onChange: (value: T) => void;
}

export default function FilterSelectMenu<T extends string>({ label, value, options, active, onChange }: Props<T>) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className={cn(active ? PILL_ACTIVE_CLS : PILL_MENU_IDLE_CLS, PILL_MENU_TRIGGER_CLS)}
      >
        <span className="min-w-0 truncate">{options.find((option) => option.value === value)?.label}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </Menu.Trigger>
      <MenuPopup align="start" className="min-w-(--anchor-width)">
        <Menu.RadioGroup value={value} onValueChange={onChange} aria-label={label}>
          {options.map((option) => (
            <Menu.RadioItem key={option.value} value={option.value} closeOnClick className={cn(MENU_ITEM_CLS, "justify-between gap-5")}>
              <span>{option.label}</span>
              <span className="flex size-3.5 shrink-0 items-center justify-center">
                <Menu.RadioItemIndicator><Check className="size-3.5" /></Menu.RadioItemIndicator>
              </span>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </MenuPopup>
    </Menu.Root>
  );
}
