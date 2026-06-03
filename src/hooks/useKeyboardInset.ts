"use client";

import { useSyncExternalStore } from "react";

// Pixels the on-screen keyboard overlaps the bottom of the layout viewport (0 when
// closed). iOS shrinks only the visual viewport when the keyboard opens, so this is
// `innerHeight - visualViewport.height - offsetTop`. Intended for a narrow use: sizing
// a bottom spacer inside a scroll region so its last rows can clear the keyboard. This
// does NOT reposition any fixed element — see [[reference_ios_keyboard_fixed_overlay]]
// for why driving a fixed overlay's position off visualViewport is a dead end.
//
// visualViewport is a live, mutable browser source (fires resize/scroll as the
// keyboard animates), so this uses useSyncExternalStore for a tear-free read.

function subscribe(onChange: () => void): () => void {
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

function getSnapshot(): number {
  const vv = window.visualViewport;
  if (!vv) {
    return 0;
  }
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

// No keyboard on the server; 0 during SSR + hydration.
function getServerSnapshot(): number {
  return 0;
}

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
