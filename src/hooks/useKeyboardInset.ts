import { useSyncExternalStore } from "react";

// iOS exposes the on-screen keyboard's size ONLY through visualViewport — there
// is no CSS unit or media query for it, and WebKit doesn't support the viewport
// meta `interactive-widget` property. So this one declarative subscription is
// the irreducible bit of JS the keyboard problem needs; positioning and
// scroll-locking stay with CSS and the dialog primitive.

function subscribe(onStoreChange: () => void): () => void {
  const viewport = window.visualViewport;
  if (!viewport) {
    return () => {};
  }
  viewport.addEventListener("resize", onStoreChange);
  viewport.addEventListener("scroll", onStoreChange);
  return () => {
    viewport.removeEventListener("resize", onStoreChange);
    viewport.removeEventListener("scroll", onStoreChange);
  };
}

function getSnapshot(): number {
  const viewport = window.visualViewport;
  if (!viewport) {
    return 0;
  }
  // Slice of the layout viewport hidden below the visual viewport: the keyboard
  // plus any browser chrome (toolbar / URL bar) stacked above it.
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

function getServerSnapshot(): number {
  return 0;
}

/** Pixels the on-screen keyboard currently occludes at the bottom of the viewport. */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
