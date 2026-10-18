"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";
import { ACTION_QUIET_CLS } from "@/config/ui-tokens";
import { useBreakpoint } from "@/hooks/useViewport";

const DialogModeContext = React.createContext<"dialog" | "drawer">("dialog");
function useDialogMode() {
  return React.useContext(DialogModeContext);
}

function Dialog({
  open,
  onOpenChange,
  children,
  responsive = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  responsive?: boolean;
}) {
  const isDesktop = useBreakpoint("sm");
  const mode = responsive && !isDesktop ? "drawer" : "dialog";

  return (
    <DialogModeContext value={mode}>
      {mode === "drawer" ? (
        <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
          <DrawerPrimitive.VirtualKeyboardProvider>{children}</DrawerPrimitive.VirtualKeyboardProvider>
        </DrawerPrimitive.Root>
      ) : (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          {children}
        </DialogPrimitive.Root>
      )}
    </DialogModeContext>
  );
}

// iOS keeps fixed elements on the layout viewport, under the keyboard; VirtualKeyboardProvider
// reports the keyboard's height, and the drawer sits on top of it and shrinks to fit above.
const DRAWER_KEYBOARD_CLS =
  "fixed inset-x-0 bottom-[var(--drawer-keyboard-inset,0px)] max-h-[min(85svh,calc(100svh_-_var(--drawer-keyboard-inset,0px)_-_var(--safe-inset-top)_-_1rem))]";

function DialogPortal({ children }: { children: React.ReactNode }) {
  const mode = useDialogMode();
  const Primitive = mode === "drawer" ? DrawerPrimitive.Portal : DialogPrimitive.Portal;
  return <Primitive>{children}</Primitive>;
}

function DialogBackdrop({ className }: { className?: string }) {
  const mode = useDialogMode();

  return mode === "drawer" ? (
    <DrawerPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        `fixed inset-0 bg-zinc-950/55 backdrop-blur-sm transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`,
        className
      )}
    />
  ) : (
    // Dialog mode has no click-to-dismiss backdrop, so the backdrop is a Close trigger.
    <DialogPrimitive.Close
      render={<div />}
      nativeButton={false}
      data-slot="dialog-backdrop"
      className={cn(
        `fixed inset-0 bg-zinc-950/55 backdrop-blur-sm cursor-default outline-none`,
        className
      )}
      aria-label="Close"
      tabIndex={-1}
    />
  );
}

// `render` is omitted so callers cannot break the portal structure.
type DialogRawPopupProps = Omit<DialogPrimitive.Popup.Props, "render" | "className" | "style"> & {
  className?: string;
  style?: React.CSSProperties;
};

function DialogRawPopup({ className, children, ...props }: DialogRawPopupProps) {
  const mode = useDialogMode();

  return mode === "drawer" ? (
    <DrawerPrimitive.Viewport>
      <DrawerPrimitive.Popup data-slot="dialog-content" className={className} {...props}>
        {children}
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Viewport>
  ) : (
    <DialogPrimitive.Popup data-slot="dialog-content" className={className} {...props}>
      {children}
    </DialogPrimitive.Popup>
  );
}

function DialogPopup({ className, children, ...props }: DialogRawPopupProps) {
  const mode = useDialogMode();

  return (
    <DialogPortal>
      <DialogBackdrop />
      {mode === "drawer" ? (
        <DialogRawPopup
          className={cn(
            `flex flex-col border border-b-0 border-zinc-200 bg-white p-0 pb-[var(--safe-inset-bottom)] shadow-2xl duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom dark:border-zinc-800 dark:bg-zinc-950`,
            DRAWER_KEYBOARD_CLS,
            "transition-[transform,opacity] data-[swipe-dismiss]:!transition-none data-[nested-drawer-open]:scale-[0.94] data-[nested-drawer-open]:opacity-40",
            className,
            "rounded-t-2xl rounded-b-none"
          )}
          {...props}
        >
          <div className="flex shrink-0 touch-none justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </div>
          {children}
        </DialogRawPopup>
      ) : (
        <DialogRawPopup
          className={cn(
            `fixed rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950`,
            "left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2",
            "origin-[var(--transform-origin)] duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-90",
            className
          )}
          {...props}
        >
          {children}
        </DialogRawPopup>
      )}
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pl-5 pr-14 py-4", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    // Stops a tap here from starting Base UI's swipe tracking, which flashes the drawer on iOS.
    // Never on the whole header: the attribute also disables the background-scroll guard.
    <div
      data-slot="dialog-footer"
      data-base-ui-swipe-ignore=""
      className={cn("flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)}
      {...props}
    />
  );
}

function DialogClose({ className, ...props }: Omit<DialogPrimitive.Close.Props, "children"> & { children?: React.ReactNode }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={className}
      {...props}
    />
  );
}

/**
 * The Cancel beside a form's main action. A drawer leaves it out: it closes by swipe or the
 * backdrop, and a Cancel beside the main action gets tapped to put the keyboard away.
 */
function DialogCancel({ className, render, ...props }: React.ComponentProps<typeof DialogClose>) {
  const mode = useDialogMode();
  if (mode === "drawer") {
    return null;
  }
  return <DialogClose render={render} className={render ? className : cn(ACTION_QUIET_CLS, className)} {...props} />;
}

export {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogRawPopup,
  DialogPopup,
  DialogClose,
  DialogCancel,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
