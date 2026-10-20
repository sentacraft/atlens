"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DELAY_MS = 200;
// Keep in sync with the opacity transition on [data-phase="complete"] in globals.css.
const FADE_MS = 220;
const FAILSAFE_MS = 20000;

type Phase = "idle" | "active" | "complete";

// The App Router emits no navigation events, so the click starts the bar and the committed route
// ends it. router.push() callers are not covered.
export default function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const armTimer = useRef<number | null>(null);
  const failsafeTimer = useRef<number | null>(null);
  const fadeTimer = useRef<number | null>(null);

  function set(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function clearTimer(ref: React.MutableRefObject<number | null>) {
    if (ref.current !== null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) {
        return;
      }
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      arm();
    }

    // Bubble phase, after React's handlers: a link whose onClick calls preventDefault (opening a
    // panel instead) must not start the bar, which would then run until the failsafe.
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function arm() {
    clearTimer(armTimer);
    clearTimer(failsafeTimer);
    clearTimer(fadeTimer);
    set("idle");
    armTimer.current = window.setTimeout(() => {
      set("active");
      failsafeTimer.current = window.setTimeout(() => {
        set("idle");
      }, FAILSAFE_MS);
    }, DELAY_MS);
  }

  useEffect(() => {
    clearTimer(armTimer);
    clearTimer(failsafeTimer);
    if (phaseRef.current === "active") {
      set("complete");
      fadeTimer.current = window.setTimeout(() => {
        set("idle");
      }, FADE_MS);
    } else {
      set("idle");
    }
  }, [pathname, search]);

  useEffect(() => {
    return () => {
      clearTimer(armTimer);
      clearTimer(failsafeTimer);
      clearTimer(fadeTimer);
    };
  }, []);

  if (phase === "idle") {
    return null;
  }

  return <div className="nav-progress" data-phase={phase} aria-hidden="true" />;
}
