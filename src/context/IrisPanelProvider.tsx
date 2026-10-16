"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import IrisPanel from "@/components/iris-panel/IrisPanel";
import type { IrisPanelRequest } from "@/components/askiris/AskIrisChat";
import { useBreakpoint } from "@/hooks/useViewport";
import { askIrisHandoffPath } from "@/lib/url/askiris";
import { ASK_IRIS_PATH } from "@/lib/url/routes";

export const IRIS_PANEL_WIDTH = 400;

/** Opens the side panel on wide screens, and the Ask Iris page elsewhere; `question` is sent at once. */
export type OpenIris = (options: { question?: string }) => void;

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
  const shown = open && wide && !onAskIrisPage;

  const routeRef = useRef({ wide, onAskIrisPage, router });
  useEffect(() => {
    routeRef.current = { wide, onAskIrisPage, router };
  }, [wide, onAskIrisPage, router]);

  const openIris = useCallback<OpenIris>(({ question }) => {
    const route = routeRef.current;
    if (!route.wide || route.onAskIrisPage) {
      route.router.push(question ? askIrisHandoffPath(question) : ASK_IRIS_PATH);
      return;
    }
    setMounted(true);
    setOpen(true);
    if (question) {
      nextRequestId.current += 1;
      setRequest({ id: nextRequestId.current, question });
    }
  }, []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    document.documentElement.style.setProperty("--iris-panel-width", shown ? `${IRIS_PANEL_WIDTH}px` : "0px");
  }, [shown]);

  return (
    <IrisPanelContext value={openIris}>
      {children}
      {/* Stays mounted while closed, so reopening continues the conversation. */}
      {mounted && <IrisPanel shown={shown} request={request} onClose={close} />}
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
