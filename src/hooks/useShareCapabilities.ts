"use client";

import { useEffect, useState } from "react";

export interface ShareCapabilities {
  mounted: boolean;
  isDesktop: boolean;
  canNativeShare: boolean;
  canShareFile: boolean;
}

export function useShareCapabilities(): ShareCapabilities {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCanNativeShare("share" in navigator);

    if ("canShare" in navigator) {
      const testFile = new File(["x"], "test.png", { type: "image/png" });
      setCanShareFile(
        (navigator as Navigator & { canShare: (d: object) => boolean }).canShare({
          files: [testFile],
        })
      );
    }

    const bp = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-sm").trim();
    const mq = window.matchMedia(`(min-width: ${bp})`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return { mounted, isDesktop, canNativeShare, canShareFile };
}
