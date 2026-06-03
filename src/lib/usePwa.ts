"use client";

import { useSyncExternalStore } from "react";

const STANDALONE = "(display-mode: standalone)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(STANDALONE).matches;
}

// Browser (non-PWA) default during SSR + hydration — no matchMedia on the
// server. Corrected on the client right after hydration, which removes the
// post-mount flash the previous useState(false)+useEffect version had.
function getServerSnapshot(): boolean {
  return false;
}

export function usePwa(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
