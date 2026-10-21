"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import IrisPanel from "@/components/iris-panel/IrisPanel";
import { useBreakpoint } from "@/hooks/useViewport";
import { track } from "@/lib/analytics/analytics";
import type { StarterPool } from "@/lib/askiris/starter-questions";
import { askIrisPagePath, type IrisEntryPoint, type IrisRequest } from "@/lib/url/askiris";
import { ASK_IRIS_PATH } from "@/lib/url/routes";
import { IRIS_PANEL_WIDTH, PAGE_MAX_WIDTH } from "@/config/ui";


/** A request as the panel receives it; a new `id` hands it in again. */
export type IrisPanelRequest = IrisRequest & { id: number };

/**
 * Opens Iris beside the page: a side panel on wide screens, a bottom sheet on narrow ones.
 * With a request it is about the page it is called from; without one (the nav) it returns to
 * the open conversation.
 */
export type OpenIris = (open: { from: IrisEntryPoint; request?: IrisRequest; pool?: StarterPool }) => void;

export interface IrisControls {
  openIris: OpenIris;
  /** Hides the panel or sheet; on the Ask Iris page, goes back to the last page before it. */
  closeIris: () => void;
  /** Whether Iris is on screen: the panel, the sheet or the Ask Iris page. */
  irisShown: boolean;
}

const IrisPanelContext = createContext<IrisControls | null>(null);

export function IrisPanelProvider({ children }: { children: ReactNode }) {
  const wide = useBreakpoint("lg");
  const pathname = usePathname();
  const router = useRouter();
  const onAskIrisPage = pathname.startsWith(ASK_IRIS_PATH);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [request, setRequest] = useState<IrisPanelRequest | null>(null);
  const nextRequestId = useRef(0);
  const shown = open && !onAskIrisPage;

  const routeRef = useRef({ wide, onAskIrisPage, router });
  useEffect(() => {
    routeRef.current = { wide, onAskIrisPage, router };
  }, [wide, onAskIrisPage, router]);

  const lastPage = useRef<string | null>(null);
  useEffect(() => {
    if (!onAskIrisPage) {
      lastPage.current = pathname + window.location.search;
    }
  }, [pathname, onAskIrisPage]);

  const openIris = useCallback<OpenIris>(({ from, request: next, pool }) => {
    const route = routeRef.current;
    const opened = (surface: "page" | "panel" | "sheet") => track("askiris_open", { entry: from, surface, pool });
    if (route.onAskIrisPage) {
      opened("page");
      route.router.push(askIrisPagePath({ question: next?.kind === "question" ? next.text : undefined }));
      return;
    }
    opened(route.wide ? "panel" : "sheet");
    setMounted(true);
    setOpen(true);
    if (next) {
      nextRequestId.current += 1;
      setRequest({ ...next, id: nextRequestId.current });
    }
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const closeIris = useCallback(() => {
    if (routeRef.current.onAskIrisPage) {
      routeRef.current.router.push(lastPage.current ?? "/");
    } else {
      setOpen(false);
    }
  }, []);
  const irisShown = shown || onAskIrisPage;
  const controls = useMemo(() => ({ openIris, closeIris, irisShown }), [openIris, closeIris, irisShown]);

  useEffect(() => {
    const beside = shown && wide;
    const root = document.documentElement.style;
    root.setProperty("--iris-panel-width", beside ? `${IRIS_PANEL_WIDTH}px` : "0px");
    // The page keeps the left edge it had when centred in the full width, so it narrows from the
    // right instead of re-centring, which slid wide pages to the left.
    root.setProperty("--iris-page-start", beside ? `max(0px, (100% - ${PAGE_MAX_WIDTH}) / 2)` : "0px");
  }, [shown, wide]);

  return (
    <IrisPanelContext value={controls}>
      {children}
      {/* Stays mounted while closed, so reopening continues the conversation. Suspense, as the
          panel reads useSearchParams, which would otherwise bail static pages out to client rendering. */}
      {mounted && (
        <Suspense fallback={null}>
          <IrisPanel layout={wide ? "side" : "sheet"} shown={shown} request={request} onClose={close} />
        </Suspense>
      )}
    </IrisPanelContext>
  );
}

export function useIris(): IrisControls {
  const controls = useContext(IrisPanelContext);
  if (!controls) {
    throw new Error("useIris must be used within IrisPanelProvider");
  }
  return controls;
}
