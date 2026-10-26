"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import AskIrisChat from "@/components/askiris/AskIrisChat";
import type { IrisPanelRequest } from "@/context/IrisPanelProvider";
import { useCurrentPagePath } from "@/hooks/useCurrentPagePath";
import { IRIS_PANEL_WIDTH, Z } from "@/config/ui";
import { askIrisChatDataQuery } from "@/lib/askiris/chat-data";
import { cn } from "@/lib/utils";

/**
 * Ask Iris beside the page on wide screens: a side panel below the nav, which the page makes room
 * for and which expands in place over it. It stays mounted while closed, keeping the chat. Narrow
 * screens show Iris on the Ask Iris page instead.
 */
export default function IrisPanel({
  shown,
  request,
  onClose,
}: {
  shown: boolean;
  request: IrisPanelRequest | null;
  onClose: () => void;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const data = useQuery(askIrisChatDataQuery(locale));
  const pagePath = useCurrentPagePath();
  const { expanded, setExpanded } = useExpanded(shown);
  const openCount = useOpenCount(shown);

  const chat = data.data ? (
    <AskIrisChat
      shell={{ variant: "panel", openCount, pagePath, request, onClose, expanded, onExpandedChange: setExpanded }}
      linkTargets={data.data.linkTargets}
      lenses={data.data.lenses}
    />
  ) : (
    <p className="grid flex-1 place-items-center text-sm text-zinc-500">
      {data.isError ? t("errorUnavailable") : t("loadingConversation")}
    </p>
  );

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

/** How many times the panel has been shown; stays mounted while closed, so this marks each opening. */
function useOpenCount(shown: boolean) {
  const [opens, setOpens] = useState({ shown, count: shown ? 1 : 0 });
  if (opens.shown !== shown) {
    setOpens({ shown, count: shown ? opens.count + 1 : opens.count });
  }
  return opens.count;
}

/**
 * Whether Iris covers the page. Expanding adds a history entry, so Back collapses it instead of
 * leaving the page; closing Iris or moving to another page collapses it.
 */
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
