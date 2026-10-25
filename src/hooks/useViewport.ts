"use client";

import { useCallback, useSyncExternalStore } from "react";
import { breakpointQuery, matchesBreakpoint, type Breakpoint } from "@/lib/breakpoints";

// A viewport check, not a device check: see useIsMobileDevice.
export function useBreakpoint(bp: Breakpoint): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = breakpointQuery(bp);
      if (!mq) {
        return () => {};
      }
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [bp],
  );

  const getSnapshot = useCallback(() => matchesBreakpoint(bp), [bp]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// A device check, not a viewport check: a narrow desktop window is still desktop.
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

function getMobileSnapshot(): boolean {
  return MOBILE_UA.test(navigator.userAgent);
}

// Desktop on the server keeps pages static; the client corrects it after hydration.
function getMobileServerSnapshot(): boolean {
  return false;
}

function subscribeMobile(): () => void {
  return () => {};
}

export function useIsMobileDevice(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, getMobileServerSnapshot);
}

const WECHAT_UA = /MicroMessenger/i;

function getWeChatSnapshot(): boolean {
  return WECHAT_UA.test(navigator.userAgent);
}

/** WeChat's in-app browser, on a phone or the desktop client. */
export function useIsWeChatBrowser(): boolean {
  return useSyncExternalStore(subscribeMobile, getWeChatSnapshot, getMobileServerSnapshot);
}
