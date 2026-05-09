"use client";

import { useSyncExternalStore } from "react";

function subscribeToDisplayModeChange(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getPwaSnapshot() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function usePwa(): boolean {
  return useSyncExternalStore(
    subscribeToDisplayModeChange,
    getPwaSnapshot,
    () => false
  );
}
