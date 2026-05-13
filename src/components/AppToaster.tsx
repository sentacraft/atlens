"use client";

import { Toaster } from "sonner";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function AppToaster() {
  const isDesktop = useBreakpoint("sm");

  return (
    <Toaster
      position={isDesktop ? "top-center" : "bottom-center"}
      offset={
        isDesktop
          // Desktop toasts sit at top-center; clear the fixed nav so the
          // pill doesn't bridge the nav-content boundary.
          ? "calc(var(--nav-height) + 1rem)"
          // Mobile toasts sit at bottom-center; clear the floating
          // compare bar (when present) and the iOS home-indicator inset.
          : "calc(var(--compare-bar-height, 0px) + var(--safe-inset-bottom) + 1rem)"
      }
      toastOptions={{ className: "!rounded-full !px-5" }}
    />
  );
}
