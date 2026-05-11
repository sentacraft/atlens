"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { SCREEN } from "@/config/ui";

export default function AppToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SCREEN.sm - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Toaster
      position={isMobile ? "bottom-center" : "top-center"}
      offset="calc(var(--compare-bar-height, 0px) + 16px)"
      mobileOffset="calc(var(--compare-bar-height, 0px) + 16px)"
      toastOptions={{ className: "whitespace-nowrap" }}
    />
  );
}
