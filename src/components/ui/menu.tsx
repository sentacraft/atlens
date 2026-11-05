"use client";

import { Menu } from "@base-ui/react/menu";
import { MENU_POPUP_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

type MenuPopupProps = Omit<Menu.Popup.Props, "className"> &
  Pick<Menu.Positioner.Props, "side" | "align" | "sideOffset"> & { className?: string };

/**
 * The popup of a list menu, with its portal and positioner. Rows fill the popup edge to edge so a
 * row's hover reaches the border; any vertical padding on the popup leaves a white strip above the
 * first row and below the last, so it is cleared here whatever `className` passes. Menus use this,
 * never `Menu.Popup` directly (ESLint enforces it).
 */
export function MenuPopup({ className, side = "bottom", align = "end", sideOffset = 6, children, ...props }: MenuPopupProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset}>
        <Menu.Popup className={cn(MENU_POPUP_CLS, className, "py-0")} {...props}>
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

/** A divider between groups of rows. It has no margin: a margin leaves a white strip between the line and the next row's hover. */
export function MenuSeparator() {
  return <Menu.Separator className="h-px bg-zinc-200" />;
}
