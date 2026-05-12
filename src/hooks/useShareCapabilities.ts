"use client";

import { useEffect, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export interface ShareCapabilities {
  mounted: boolean;
  isDesktop: boolean;
  canNativeShare: boolean;
  canShareFile: boolean;
}

function detectCapabilities() {
  const canNativeShare = "share" in navigator;
  let canShareFile = false;
  if ("canShare" in navigator) {
    const testFile = new File(["x"], "test.png", { type: "image/png" });
    canShareFile = (navigator as Navigator & { canShare: (d: object) => boolean }).canShare({
      files: [testFile],
    });
  }
  return { canNativeShare, canShareFile };
}

export function useShareCapabilities(): ShareCapabilities {
  const [caps, setCaps] = useState<{ canNativeShare: boolean; canShareFile: boolean } | null>(null);
  const isDesktop = useBreakpoint("sm");

  useEffect(() => { setCaps(detectCapabilities()); }, []);

  return {
    mounted: caps !== null,
    isDesktop,
    canNativeShare: caps?.canNativeShare ?? false,
    canShareFile: caps?.canShareFile ?? false,
  };
}
