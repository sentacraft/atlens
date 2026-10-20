"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Drawer } from "@base-ui/react/drawer";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import type { IrisPanelRequest } from "@/context/IrisPanelProvider";
import { useCurrentPagePath } from "@/hooks/useCurrentPagePath";
import { Z } from "@/config/ui";
import { askIrisChatDataQuery } from "@/lib/askiris/chat-data";
import { cn } from "@/lib/utils";

/**
 * Ask Iris beside the page: a side panel below the nav on wide screens, which the page makes
 * room for, and a bottom sheet on narrow ones. Both stay mounted while closed, keeping the chat.
 */
export default function IrisPanel({
  layout,
  shown,
  request,
  onClose,
}: {
  layout: "side" | "sheet";
  shown: boolean;
  request: IrisPanelRequest | null;
  onClose: () => void;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const data = useQuery(askIrisChatDataQuery(locale));
  const pagePath = useCurrentPagePath();

  const chat = data.data ? (
    <AskIrisChat
      shell={{ variant: "panel", pagePath, request, onClose }}
      linkTargets={data.data.linkTargets}
      lenses={data.data.lenses}
    />
  ) : (
    <p className="grid flex-1 place-items-center text-sm text-zinc-500">
      {data.isError ? t("errorUnavailable") : t("loadingConversation")}
    </p>
  );

  if (layout === "side") {
    return (
      <aside
        aria-label="Iris"
        hidden={!shown}
        className={cn(
          "fixed right-0 bottom-0 flex w-[var(--iris-panel-width)] flex-col border-l border-zinc-200 bg-white",
          // --nav-height leaves out the nav's 1px bottom border, which the panel would cover: it stacks above the nav.
          "top-[calc(var(--nav-height)+1px)] pb-[var(--safe-inset-bottom)]",
          Z.fixed,
        )}
      >
        {chat}
      </aside>
    );
  }

  return (
    <Drawer.Root open={shown} onOpenChange={(open) => !open && onClose()} swipeDirection="down">
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal keepMounted>
          <Drawer.Backdrop
            className={cn(
              "fixed inset-0 bg-zinc-950/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
            )}
          />
          {/* No z-index, like every portaled popup (see Z): a lens preview opened from the sheet stacks above it. */}
          <Drawer.Viewport className="fixed inset-0">
            <Drawer.Popup
              aria-label="Iris"
              className={cn(
                "fixed inset-x-0 flex flex-col rounded-t-3xl bg-white pb-[var(--safe-inset-bottom)] shadow-2xl ring-1 ring-zinc-200",
                // iOS leaves fixed elements under the keyboard; the provider reports its height, and the
                // sheet sits on top of it, shrinking so the composer stays above.
                "bottom-[var(--drawer-keyboard-inset,0px)] h-[min(85svh,calc(100svh_-_var(--drawer-keyboard-inset,0px)_-_var(--safe-inset-top)_-_1rem))]",
                "[transform:translateY(var(--drawer-swipe-movement-y,0px))] transition-[transform,translate] duration-300 ease-out data-[swiping]:transition-none",
                "data-ending-style:translate-y-full data-starting-style:translate-y-full",
              )}
            >
              <div className="flex shrink-0 touch-none justify-center pt-2.5 pb-0.5">
                <div className="h-1.5 w-10 rounded-full bg-zinc-300" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{chat}</div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}
