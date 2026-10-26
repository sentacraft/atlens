"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import IrisPanel from "@/components/iris-panel/IrisPanel";
import { useBreakpoint } from "@/hooks/useViewport";
import { track } from "@/lib/analytics/analytics";
import type { StarterPool } from "@/lib/askiris/starter-questions";
import { askIrisPagePath, takePanelConversationParam, type IrisEntryPoint, type IrisRequest } from "@/lib/url/askiris";
import { ASK_IRIS_PATH } from "@/lib/url/routes";
import { IRIS_PANEL_WIDTH, PAGE_MAX_WIDTH } from "@/config/ui";


/** One opening as the panel receives it; `open` is an opening with nothing to hand in. */
export type IrisPanelRequest = (IrisRequest | { kind: "open" }) & { id: number };

/**
 * Opens Iris: a side panel beside the page on wide screens, the Ask Iris page on narrow ones,
 * where Iris is a section of its own. Each opening starts a new conversation, sending the
 * request's question at once.
 */
export type OpenIris = (open: { from: IrisEntryPoint; request?: IrisRequest; pool?: StarterPool }) => void;

export interface IrisControls {
  openIris: OpenIris;
  /** Hides the panel; on the Ask Iris page, goes back to the last page before it. */
  closeIris: () => void;
  /** Whether Iris is on screen: the panel or the Ask Iris page. */
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
  const shown = open && wide && !onAskIrisPage;

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
    const opened = (surface: "page" | "panel") => track("askiris_open", { entry: from, surface, pool });
    if (route.onAskIrisPage || !route.wide) {
      opened("page");
      route.router.push(
        askIrisPagePath({
          ...(next?.kind === "conversation"
            ? { conversationId: next.conversationId }
            : { question: next?.kind === "question" ? next.text : undefined }),
          from: route.onAskIrisPage ? undefined : window.location.pathname + window.location.search,
        }),
      );
      return;
    }
    opened("panel");
    setMounted(true);
    setOpen(true);
    nextRequestId.current += 1;
    setRequest({ ...(next ?? { kind: "open" }), id: nextRequestId.current });
  }, []);
  useEffect(() => {
    const conversationId = takePanelConversationParam();
    if (conversationId) {
      openIris({ from: "sign_in", request: { kind: "conversation", conversationId } });
    }
  }, [openIris]);
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
      {mounted && wide && (
        <Suspense fallback={null}>
          <IrisPanel shown={shown} request={request} onClose={close} />
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
