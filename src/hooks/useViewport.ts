"use client";

import { useCallback, useSyncExternalStore } from "react";

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

function getMediaQuery(bp: Breakpoint): MediaQueryList | null {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--breakpoint-${bp}`)
    .trim();
  return value ? window.matchMedia(`(min-width: ${value})`) : null;
}

// A viewport check, not a device check: see useIsMobileDevice.
export function useBreakpoint(bp: Breakpoint): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = getMediaQuery(bp);
      if (!mq) {
        return () => {};
      }
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [bp],
  );

  const getSnapshot = useCallback(() => getMediaQuery(bp)?.matches ?? false, [bp]);

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

// Only for sizing a bottom spacer. Positioning a fixed overlay off visualViewport is a dead end
// on iOS: [[reference_ios_keyboard_fixed_overlay]].

function subscribeKeyboard(onChange: () => void): () => void {
  const vv = window.visualViewport;
  if (!vv) {
    return () => {};
  }
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

function getKeyboardSnapshot(): number {
  const vv = window.visualViewport;
  if (!vv) {
    return 0;
  }
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

function getKeyboardServerSnapshot(): number {
  return 0;
}

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribeKeyboard, getKeyboardSnapshot, getKeyboardServerSnapshot);
}
