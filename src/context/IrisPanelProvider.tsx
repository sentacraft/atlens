"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import IrisPanel from "@/components/iris-panel/IrisPanel";
import { useBreakpoint } from "@/hooks/useViewport";
import { track } from "@/lib/analytics/analytics";
import type { StarterPool } from "@/lib/askiris/starter-questions";
import { askIrisPagePath, type IrisEntryPoint, type IrisRequest } from "@/lib/url/askiris";
import { ASK_IRIS_PATH } from "@/lib/url/routes";

export const IRIS_PANEL_WIDTH = 400;

/** What opening the panel asks of it; `resume` comes from the Ask Iris page, on its way back to `from`. */
export type PanelRequest = IrisRequest | { kind: "resume"; conversationId: string; from: string };

/** A request as the panel receives it; a new `id` hands it in again. */
export type IrisPanelRequest = PanelRequest & { id: number };

/**
 * Opens Iris beside the page: a side panel on wide screens, a bottom sheet on narrow ones.
 * With a request it is about the page it is called from; without one (the nav) it returns to
 * the open conversation in the panel, or goes to the Ask Iris page on narrow screens.
 */
export type OpenIris = (open: { from: IrisEntryPoint; request?: PanelRequest; pool?: StarterPool }) => void;

// Only the action is shared: entry points need to open the panel, not to watch it.
const IrisPanelContext = createContext<OpenIris | null>(null);

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

  const openIris = useCallback<OpenIris>(({ from, request: next, pool }) => {
    const route = routeRef.current;
    const opened = (surface: "page" | "panel" | "sheet") => track("askiris_open", { entry: from, surface, pool });
    if (!next && !route.wide) {
      opened("page");
      route.router.push(ASK_IRIS_PATH);
      return;
    }
    // A resume is sent while leaving the Ask Iris page, so the page check does not apply.
    if (route.onAskIrisPage && next?.kind !== "resume") {
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

  useEffect(() => {
    document.documentElement.style.setProperty("--iris-panel-width", shown && wide ? `${IRIS_PANEL_WIDTH}px` : "0px");
  }, [shown, wide]);

  return (
    <IrisPanelContext value={openIris}>
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

export function useOpenIris(): OpenIris {
  const openIris = useContext(IrisPanelContext);
  if (!openIris) {
    throw new Error("useOpenIris must be used within IrisPanelProvider");
  }
  return openIris;
}
