"use client";

import { useEffect, useState, type RefObject } from "react";

// Fields that raise the on-screen keyboard; checkboxes and the like do not.
const TEXT_FIELD = "input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=reset],[type=range],[type=file]), textarea, [contenteditable='true'], [contenteditable='']";

// A keyboard takes far more than browser toolbars do; this tells the two apart.
const KEYBOARD_MIN_PX = 150;

function isTextField(target: EventTarget | null) {
  return target instanceof Element && target.matches(TEXT_FIELD);
}

/**
 * The height left above the on-screen keyboard, null while it is down. Read by `KeyboardInsets`,
 * which hands it to layouts as CSS; components use that, not this. Measured against the tallest
 * visible height seen at this width, not `innerHeight`: some iOS keyboards shrink the window
 * along with the visible area, and `innerHeight` and `svh` disagree with it by the toolbars on
 * iOS 26. Focus alone is not enough: an autofocused field raises no keyboard.
 */
export function useKeyboardViewport(): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    let field: EventTarget | null = document.activeElement;
    let width = viewport.width;
    let tallest = Math.max(viewport.height, window.innerHeight);
    const update = () => {
      if (viewport.width !== width) {
        width = viewport.width;
        tallest = Math.max(viewport.height, window.innerHeight);
      }
      tallest = Math.max(tallest, viewport.height);
      const up = isTextField(field) && tallest - viewport.height > KEYBOARD_MIN_PX;
      setHeight(up ? Math.floor(viewport.height) : null);
    };
    const onFocusIn = (event: FocusEvent) => {
      field = event.target;
      update();
    };
    const onFocusOut = (event: FocusEvent) => {
      field = event.relatedTarget;
      update();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    viewport.addEventListener("resize", update);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      viewport.removeEventListener("resize", update);
    };
  }, []);
  return height;
}

/**
 * For a layout one `--page-height` tall: while the keyboard is up, scrolls the page so `ref`'s
 * bottom meets the visible bottom. Safari pans the page on focus to reveal the field, measured
 * against the full-height layout, which leaves the top bar off screen and a gap below once the
 * layout has fitted itself above the keyboard.
 */
export function useFitAboveKeyboard(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const active = useKeyboardViewport() !== null && enabled;
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) {
      return;
    }
    const align = () => {
      const bottom = ref.current?.getBoundingClientRect().bottom;
      if (bottom === undefined) {
        return;
      }
      const delta = Math.round(bottom - (viewport.offsetTop + viewport.height));
      if (Math.abs(delta) > 1) {
        window.scrollBy(0, delta);
      }
    };
    // Safari's own reveal scroll lands over the next frames; aligning after it wins.
    let frame = requestAnimationFrame(() => {
      align();
      frame = requestAnimationFrame(align);
    });
    viewport.addEventListener("resize", align);
    viewport.addEventListener("scroll", align);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", align);
      viewport.removeEventListener("scroll", align);
    };
  }, [ref, active]);
}
