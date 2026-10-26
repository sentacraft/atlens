"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Drawer } from "@base-ui/react/drawer";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import type { IrisPanelRequest } from "@/context/IrisPanelProvider";
import { useCurrentPagePath } from "@/hooks/useCurrentPagePath";
import { IRIS_PANEL_WIDTH, Z } from "@/config/ui";
import { askIrisChatDataQuery } from "@/lib/askiris/chat-data";
import { cn } from "@/lib/utils";

/**
 * Ask Iris beside the page: a side panel below the nav on wide screens, which the page makes
 * room for and which expands in place over it; on narrow ones, a full-screen sheet above the tab
 * bar, so the tab bar shows Iris as the current section. Both stay mounted while closed, keeping
 * the chat.
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
  const side = useExpanded(shown && layout === "side");
  useBackCloses(shown && layout === "sheet", onClose);
  const expanded = layout === "sheet" || side.expanded;
  const openCount = useOpenCount(shown);

  const chat = data.data ? (
    <AskIrisChat
      shell={{ variant: "panel", layout, openCount, pagePath, request, onClose, expanded, onExpandedChange: side.setExpanded }}
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
        data-iris=""
        // Expanding moves the left edge, so the width animates instead of jumping.
        style={{ left: expanded ? 0 : `calc(100% - ${IRIS_PANEL_WIDTH}px)` }}
        className={cn(
          "fixed right-0 bottom-0 flex flex-col bg-white",
          !expanded && "border-l border-zinc-200",
          // --nav-height leaves out the nav's 1px bottom border, which the panel would cover: it stacks above the nav.
          "top-[calc(var(--nav-height)+1px)] pb-[var(--safe-inset-bottom)]",
          // Hidden by sliding out, not `hidden`, so closing can animate; visibility keeps it out of focus and the accessibility tree once out.
          "transition-[left,translate,visibility] duration-300 ease-out motion-reduce:transition-none starting:translate-x-full",
          !shown && "invisible translate-x-full",
          Z.fixed,
        )}
      >
        {chat}
      </aside>
    );
  }

  return (
    // Not modal and not dismissed by outside presses: the tab bar below stays usable, and its own
    // Ask Iris button closes the sheet. It switches in and out like the other tabs' pages, so it
    // neither slides nor closes on a swipe, which Base UI's drawer has no switch to turn off.
    <Drawer.Root
      open={shown}
      onOpenChange={(open, details) => !open && details.reason !== "swipe" && onClose()}
      modal={false}
      disablePointerDismissal
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal keepMounted>
          {/* No z-index, like every portaled popup (see Z): popups opened from the sheet, History among them, stack above it.
              The viewport spans only the sheet, so it leaves the tab bar below it clickable. iOS leaves fixed
              elements under the keyboard; the provider reports its height, and the sheet ends on top of it
              while it is open, else on top of the tab bar. */}
          <Drawer.Viewport className="fixed inset-x-0 top-0 bottom-[max(var(--drawer-keyboard-inset,0px),var(--tab-bar-height))]">
            <Drawer.Popup
              aria-label="Iris"
              data-iris=""
              className={cn(
                "absolute inset-0 flex flex-col bg-white pt-[var(--safe-inset-top)]",
                // A drawer opened from the sheet (History) is nested and gets no backdrop of its own, so the sheet dims itself.
                "after:pointer-events-none after:absolute after:inset-0 after:bg-zinc-950/40 after:opacity-0 after:transition-opacity after:duration-200 data-[nested-drawer-open]:after:opacity-100",
              )}
            >
              <div className="flex min-h-0 flex-1 flex-col">{chat}</div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}

/**
 * The phone's Back closes the open sheet: opening adds a history entry, which closing takes back.
 * Moving to another page (a tab, a link in a reply) closes it and leaves the entry, which now sits
 * under the page left behind.
 */
function useBackCloses(active: boolean, onClose: () => void) {
  const pathname = usePathname();
  const pushedEntry = useRef(false);
  const openedOn = useRef(pathname);
  const close = useEffectEvent(onClose);

  // Push and take back in one place, not in an effect's cleanup: React may tear an effect down and
  // set it up again while the sheet stays open, and Back from that cleanup would close it.
  useEffect(() => {
    if (active && !pushedEntry.current) {
      window.history.pushState(null, "", window.location.href);
      pushedEntry.current = true;
    } else if (!active && pushedEntry.current) {
      pushedEntry.current = false;
      window.history.back();
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const onPopState = () => {
      pushedEntry.current = false;
      close();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [active]);

  useEffect(() => {
    if (openedOn.current === pathname) {
      return;
    }
    openedOn.current = pathname;
    if (active) {
      pushedEntry.current = false;
      close();
    }
  }, [pathname, active]);
}

/**
 * Whether Iris covers the page. Expanding adds a history entry, so Back collapses it instead of
 * leaving the page; closing Iris or moving to another page collapses it.
 */
/** How many times the panel has been shown; stays mounted while closed, so this marks each opening. */
function useOpenCount(shown: boolean) {
  const [opens, setOpens] = useState({ shown, count: shown ? 1 : 0 });
  if (opens.shown !== shown) {
    setOpens({ shown, count: shown ? opens.count + 1 : opens.count });
  }
  return opens.count;
}

function useExpanded(shown: boolean) {
  const pathname = usePathname();
  const [expanded, setExpandedState] = useState(false);
  const pushedEntry = useRef(false);

  const setExpanded = useCallback((next: boolean) => {
    if (next) {
      window.history.pushState(null, "", window.location.href);
      pushedEntry.current = true;
    } else if (pushedEntry.current) {
      pushedEntry.current = false;
      window.history.back();
    }
    setExpandedState(next);
  }, []);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const onPopState = () => {
      pushedEntry.current = false;
      setExpandedState(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [expanded]);

  // A link outside Iris (the nav, its menu) leads to a page Iris covers. One to the current page
  // changes no path, so the pathname rule below would leave Iris over it; the link's own
  // navigation pushes an entry, so the one pushed on expanding stays.
  useEffect(() => {
    if (!expanded) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.closest("[data-iris]") || link.target === "_blank" || link.origin !== window.location.origin) {
        return;
      }
      pushedEntry.current = false;
      setExpandedState(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [expanded]);

  // Closing Iris collapses it, taking back the entry Back would have stepped over.
  useEffect(() => {
    if (!shown) {
      setExpanded(false);
    }
  }, [shown, setExpanded]);

  const expandedOn = useRef(pathname);
  useEffect(() => {
    if (expandedOn.current === pathname) {
      return;
    }
    expandedOn.current = pathname;
    // Another page: the pushed entry now sits under the page left behind, so it stays.
    pushedEntry.current = false;
    setExpandedState(false);
  }, [pathname]);

  return { expanded, setExpanded };
}
