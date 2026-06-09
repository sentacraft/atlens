"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Only surface the bar if the navigation is still in flight after this long.
// Anything faster completes before the timer fires, so it never appears — which
// is the whole point: no flash on the quick navigations.
const DELAY_MS = 200;
// How long the fade-out runs once a navigation lands (keep in sync with the
// opacity transition on [data-phase="complete"] in globals.css).
const FADE_MS = 220;
// Failsafe: if a click starts the bar but no route change ever lands (e.g. the
// click resolved to a no-op), force it back to idle instead of spinning forever.
const FAILSAFE_MS = 20000;

type Phase = "idle" | "active" | "complete";

/**
 * Custom top navigation progress bar.
 *
 * The App Router emits no navigation events, so the only reliable 0ms "start"
 * signal is the click itself; "end" is the committed route (pathname/search)
 * changing. We debounce start by DELAY_MS so fast/prefetched navigations never
 * flash a bar — only the slow ones (the ones worth signalling) cross the
 * threshold. This is the JS-timer pattern nextjs-toploader couldn't express,
 * which is why it replaces that dependency.
 *
 * Scope: internal <a>/<Link> clicks. Imperative router.push() callers emit no
 * click and the App Router pushes history only after the navigation commits, so
 * they are not covered here — that needs a shared start() helper in those call
 * sites and is left as a follow-up.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const [phase, setPhase] = useState<Phase>("idle");
  // Mirror phase in a ref so the route-change effect can read the live value
  // synchronously without depending on phase (which would re-arm the effect).
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

  // START: capture internal link clicks before navigation begins.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignore non-primary clicks and modifier clicks (new tab / window).
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
      // External links and same-page / pure-hash links never trigger a route
      // transition, so they should never start the bar.
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

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
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

  // END: the committed route changed.
  useEffect(() => {
    clearTimer(armTimer);
    clearTimer(failsafeTimer);
    if (phaseRef.current === "active") {
      // Bar was visible — fade it out, then unmount.
      set("complete");
      fadeTimer.current = window.setTimeout(() => {
        set("idle");
      }, FADE_MS);
    } else {
      // Navigation finished within the debounce — bar never showed.
      set("idle");
    }
  }, [pathname, search]);

  // Clear any outstanding timers on unmount.
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
