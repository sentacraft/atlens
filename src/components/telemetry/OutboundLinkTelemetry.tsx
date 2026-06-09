"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/analytics";

// Global click delegate: any anchor with target="_blank" and an external
// href fires an `outbound_click` event. Lives at the layout level so a
// single listener covers every page without having to wrap each <a>.
export default function OutboundLinkTelemetry() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest("a");
      if (!anchor) {
        return;
      }
      if (anchor.target !== "_blank") {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) {
          return;
        }
        track("outbound_click", { href: url.toString() });
      } catch {
        // Ignore malformed hrefs.
      }
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
