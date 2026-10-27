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
 * How much of the layout viewport the on-screen keyboard covers, 0 while it is down. iOS Safari
 * keeps the layout viewport, and with it `svh` and fixed elements, at full height under the
 * keyboard, so a one-screen layout must take this off itself. Focus alone is not enough: an
 * autofocused field raises no keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    let field: EventTarget | null = document.activeElement;
    const update = () => {
      const covered = viewport ? window.innerHeight - viewport.height : 0;
      setInset(isTextField(field) && (!viewport || covered > KEYBOARD_MIN_PX) ? Math.max(0, Math.round(covered)) : 0);
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
    viewport?.addEventListener("resize", update);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      viewport?.removeEventListener("resize", update);
    };
  }, []);
  return inset;
}

/**
 * Scrolls the page so `ref`'s bottom meets the visible viewport's bottom while `active`. Safari
 * pans the page on focus to reveal the field, measured against the full-height layout; once the
 * layout has shrunk for the keyboard that pan leaves the top bar off screen and a gap below.
 */
export function useBottomAtKeyboard(ref: RefObject<HTMLElement | null>, active: boolean) {
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
