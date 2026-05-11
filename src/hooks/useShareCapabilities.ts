"use client";

import { useEffect, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export interface ShareCapabilities {
  mounted: boolean;
  isDesktop: boolean;
  canNativeShare: boolean;
  canShareFile: boolean;
}

export function useShareCapabilities(): ShareCapabilities {
  const [mounted, setMounted] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);
  const isDesktop = useBreakpoint("sm");

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
  }, []);

  return { mounted, isDesktop, canNativeShare, canShareFile };
}
