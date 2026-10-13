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

function getServerSnapshot(): boolean {
  return false;
}

export function usePwa(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
