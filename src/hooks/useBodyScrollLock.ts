import { useEffect } from "react";

// Base UI's modal scroll lock uses `overflow: hidden`, which WebKit ignores for
// touch panning — so behind a full-screen dialog the body still scrolls, and
// iOS still scrolls the page to bring a focused input into view, dragging the
// dialog up with it. Pinning the body with `position: fixed` (offset by the
// current scroll) is the only thing iOS honors; restore it on release so the
// page stays where it was.
export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: documentElement.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    documentElement.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = previous.htmlOverflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
