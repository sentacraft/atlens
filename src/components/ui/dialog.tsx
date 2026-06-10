"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";
import { Z } from "@/config/ui";
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
          {children}
        </DrawerPrimitive.Root>
      ) : (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          {children}
        </DialogPrimitive.Root>
      )}
    </DialogModeContext>
  );
}

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
        `fixed inset-0 ${Z.dialog} bg-zinc-950/55 backdrop-blur-sm transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`,
        className
      )}
    />
  ) : (
    // Dialog mode has no native click-to-dismiss backdrop, so we render the
    // backdrop AS a Close trigger: clicking it routes through Base UI's internal
    // onOpenChange, no callback threading. (DialogPrimitive.Backdrop is purely
    // presentational — role="presentation", no press handler.)
    <DialogPrimitive.Close
      render={<div />}
      nativeButton={false}
      data-slot="dialog-backdrop"
      className={cn(
        `fixed inset-0 ${Z.dialog} bg-zinc-950/55 backdrop-blur-sm cursor-default outline-none`,
        className
      )}
      aria-label="Close"
      tabIndex={-1}
    />
  );
}

// Bare popup element with no positioning or box chrome — the escape hatch for
// callers (e.g. the fullscreen lightbox) that paint their own surface. Drawer
// mode wraps it in the swipe Viewport. `render` is omitted from the prop type so
// callers cannot replace the element and corrupt the fixed portal structure.
// Narrow className/style to their plain forms: Base UI's Dialog and Drawer popups
// each accept a state-callback variant keyed to their own (incompatible) popup
// state, so the union forms can't be forwarded to both. Every caller passes plain
// values anyway. `render` is omitted so callers can't swap the element and corrupt
// the fixed portal structure.
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

// Opinionated surface: Portal + Backdrop + a positioned box (centered card on
// desktop, bottom sheet on mobile). Callers compose their own header/body/footer
// and place a <DialogClose> wherever they want one.
function DialogPopup({ className, children, ...props }: DialogRawPopupProps) {
  const mode = useDialogMode();

  return (
    <DialogPortal>
      <DialogBackdrop />
      {mode === "drawer" ? (
        <DialogRawPopup
          className={cn(
            `flex max-h-[85svh] flex-col border border-b-0 border-zinc-200 bg-white p-0 pb-[var(--safe-inset-bottom)] shadow-2xl duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom dark:border-zinc-800 dark:bg-zinc-950`,
            `fixed inset-x-0 bottom-0 ${Z.dialog}`,
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
            `fixed ${Z.dialog} rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950`,
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
    // data-base-ui-swipe-ignore stops a TAP on these buttons from starting Base UI's
    // swipe tracking, which puts `transition: none` on the popup and flashes the drawer
    // back mid-close on iOS. Keep it scoped to close-triggering controls — do NOT swipe-
    // ignore the whole popup/header: the same attribute also disables Base UI's
    // background-scroll guard for that element (its document touchmove handler early-
    // returns on `ignoreTouchSwipeRef`), and on the non-scrollable header that lets the
    // overlay pan + the page scroll through when the keyboard is up. The header must stay
    // swipe-active so the guard keeps protecting it.
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

export {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogRawPopup,
  DialogPopup,
  DialogClose,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
