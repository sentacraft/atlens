"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { FROSTED_OVERLAY_CHROME_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
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

function DialogTrigger({
  className,
  ...props
}: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      className={className}
      {...props}
    />
  );
}

function DialogPortal({
  children,
  ...props
}: DialogPrimitive.Portal.Props) {
  return (
    <DialogPrimitive.Portal {...props}>
      {children}
    </DialogPrimitive.Portal>
  );
}

// Clicking the backdrop dismisses the dialog. We render it as a
// DialogPrimitive.Close so the close flows through Base UI's internal
// onOpenChange — no need to thread the callback through props.
function DialogBackdrop({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close
      render={<div />}
      nativeButton={false}
      data-slot="dialog-backdrop"
      className={cn(
        "absolute inset-0 bg-zinc-950/55 backdrop-blur-sm cursor-default outline-none",
        className
      )}
      aria-label="Close"
      tabIndex={-1}
    />
  );
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogPrimitive.Popup.Props & {
    backdropClassName?: string;
    layerRef?: React.Ref<HTMLDivElement>;
    showCloseButton?: boolean;
    /** Renders the close button outside the popup at the card's top-right corner (-right-4 -top-4).
     *  Requires the popup to NOT have overflow-hidden (move it to inner content instead). */
    showOverlayCloseButton?: boolean;
    /** Omits the default centered positioning (left-1/2 top-1/2 max-w-2xl -translate-*) so the
     *  caller can supply custom fixed inset classes without Tailwind class conflicts. */
    noDefaultPositioning?: boolean;
  }
>(function DialogContent(
  {
    className,
    backdropClassName,
    children,
    layerRef,
    showCloseButton = true,
    showOverlayCloseButton = false,
    noDefaultPositioning = false,
    render: _render, // eslint-disable-line @typescript-eslint/no-unused-vars -- strip before DOM spread
    ...props
  },
  ref
) {
  const mode = useDialogMode();

  if (mode === "drawer") {
    return (
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop
          data-slot="dialog-backdrop"
          className={cn(
            `fixed inset-0 ${Z.dialog} bg-zinc-950/55 backdrop-blur-sm transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`,
            backdropClassName
          )}
        />
        <DrawerPrimitive.Viewport>
          <DrawerPrimitive.Popup
            ref={ref}
            data-slot="dialog-content"
            className={cn(
              `fixed inset-x-0 bottom-0 ${Z.dialog} flex max-h-[85svh] flex-col border border-b-0 border-zinc-200 bg-white p-0 pb-[var(--safe-inset-bottom)] shadow-2xl duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom dark:border-zinc-800 dark:bg-zinc-950`,
              "transition-[transform,opacity] data-[swipe-dismiss]:!transition-none data-[nested-drawer-open]:scale-[0.94] data-[nested-drawer-open]:opacity-40",
              className,
              "rounded-t-2xl rounded-b-none"
            )}
            {...(props as Omit<typeof props, "style">)}
          >
            <div className="flex shrink-0 touch-none justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
            {children}
            {layerRef && <div ref={layerRef} />}
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.Portal>
    );
  }

  return (
    <DialogPortal>
      <div ref={layerRef} className={cn("fixed inset-0", Z.dialog)}>
        <DialogBackdrop className={backdropClassName} />
        <DialogPrimitive.Popup
          ref={ref}
          data-slot="dialog-content"
          className={cn(
            `fixed ${Z.local} rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950`,
            !noDefaultPositioning && "left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2",
            "origin-[var(--transform-origin)] duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-90",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "absolute right-4 top-4 z-10 h-9 w-9")}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
          {showOverlayCloseButton && (
            <DialogPrimitive.Close className="absolute -right-4 -top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </div>
    </DialogPortal>
  );
});

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
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
