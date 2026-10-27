"use client";

import { useEffect } from "react";
import { useKeyboardViewport } from "@/hooks/useKeyboardViewport";

/**
 * Hands the on-screen keyboard to CSS: `data-keyboard` on <html> while it is up, and
 * `--keyboard-visible-height`, the height left above it, which `theme.css` turns into
 * `--page-height` and a hidden tab bar.
 */
export default function KeyboardInsets() {
  const height = useKeyboardViewport();
  useEffect(() => {
    const root = document.documentElement;
    if (height === null) {
      delete root.dataset.keyboard;
      root.style.removeProperty("--keyboard-visible-height");
    } else {
      root.dataset.keyboard = "";
      root.style.setProperty("--keyboard-visible-height", `${height}px`);
    }
  }, [height]);
  return null;
}
